import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push crypto utilities for VAPID
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPrivateKey: string,
  vapidPublicKey: string,
  vapidSubject: string
): Promise<Response> {
  // Use the web-push protocol directly
  // Import jose for JWT signing
  const { SignJWT, importPKCS8, importJWK, base64url } = await import(
    "https://esm.sh/jose@5.2.2"
  );

  const audience = new URL(subscription.endpoint).origin;

  // VAPID private key is base64url-encoded raw 32-byte key
  // Convert to JWK for P-256
  const privateKeyBytes = base64url.decode(vapidPrivateKey);
  const publicKeyBytes = base64url.decode(vapidPublicKey);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: vapidPrivateKey,
    x: base64url.encode(publicKeyBytes.slice(1, 33)),
    y: base64url.encode(publicKeyBytes.slice(33, 65)),
  };

  const privateKey = await importJWK(jwk, "ES256");

  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setAudience(audience)
    .setSubject(vapidSubject)
    .setExpirationTime("22h")
    .sign(privateKey);

  const vapidAuth = `vapid t=${jwt}, k=${vapidPublicKey}`;

  // For simplicity, send unencrypted payload via TTL with urgency
  // Full encryption requires ECDH - using fetch with aes128gcm
  // We'll use a simpler approach: send the notification with the payload

  // Encrypt payload using Web Push encryption (aes128gcm)
  const authBytes = base64url.decode(subscription.auth);
  const p256dhBytes = base64url.decode(subscription.p256dh);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    p256dhBytes,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey(
    "raw",
    localKeyPair.publicKey
  );

  // HKDF-based key derivation for aes128gcm
  const encoder = new TextEncoder();

  // IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info\0" || client_public || server_public, 32)
  const authInfo = new Uint8Array([
    ...encoder.encode("WebPush: info\0"),
    ...new Uint8Array(p256dhBytes),
    ...new Uint8Array(localPublicKeyRaw),
  ]);

  const authHkdfKey = await crypto.subtle.importKey(
    "raw",
    authBytes,
    "HKDF",
    false,
    ["deriveBits"]
  );

  // PRK from auth
  const ikm_key = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(sharedSecret),
    "HKDF",
    false,
    ["deriveBits"]
  );

  // Step 1: Extract PRK using auth as salt
  const prkBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authBytes, info: authInfo },
    ikm_key,
    256
  );

  // Content encryption key
  const cekInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: aes128gcm\0"),
  ]);
  const cekKey = await crypto.subtle.importKey(
    "raw",
    prkBits,
    "HKDF",
    false,
    ["deriveBits"]
  );
  const cekBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: cekInfo,
    },
    cekKey,
    128
  );

  // Nonce
  const nonceInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: nonce\0"),
  ]);
  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: nonceInfo,
    },
    cekKey,
    96
  );

  // Encrypt with AES-128-GCM
  const payloadBytes = encoder.encode(payload);
  // Add padding delimiter
  const paddedPayload = new Uint8Array([...payloadBytes, 2]);

  const aesKey = await crypto.subtle.importKey(
    "raw",
    cekBits,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits) },
    aesKey,
    paddedPayload
  );

  // Build aes128gcm header: salt (16) + rs (4) + idlen (1) + keyid (65)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  // Recalculate with actual salt
  const cekKey2 = await crypto.subtle.importKey("raw", prkBits, "HKDF", false, ["deriveBits"]);
  const cekBits2 = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    cekKey2,
    128
  );
  const nonceBits2 = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    cekKey2,
    96
  );
  const aesKey2 = await crypto.subtle.importKey("raw", cekBits2, "AES-GCM", false, ["encrypt"]);
  const encrypted2 = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBits2) },
    aesKey2,
    paddedPayload
  );

  const localPubBytes = new Uint8Array(localPublicKeyRaw);
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);

  const header = new Uint8Array([
    ...salt,
    ...rs,
    localPubBytes.length,
    ...localPubBytes,
  ]);

  const body = new Uint8Array([...header, ...new Uint8Array(encrypted2)]);

  return fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      Authorization: vapidAuth,
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "86400",
      Urgency: "high",
    },
    body,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, url } = await req.json();

    if (!user_id || !title) {
      return new Response(
        JSON.stringify({ error: "user_id and title required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    if (!vapidPrivateKey || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all push subscriptions for this user
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, reason: "no_subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({ title, body: body || "", url: url || "/" });

    let sent = 0;
    let failed = 0;
    for (const sub of subscriptions) {
      try {
        const resp = await sendWebPush(
          sub,
          payload,
          vapidPrivateKey,
          vapidPublicKey,
          "mailto:push@partnerai.app"
        );
        if (resp.ok || resp.status === 201) {
          sent++;
        } else if (resp.status === 410 || resp.status === 404) {
          // Subscription expired, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
          failed++;
        } else {
          console.error(`Push failed: ${resp.status} ${await resp.text()}`);
          failed++;
        }
      } catch (err) {
        console.error("Push send error:", err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
