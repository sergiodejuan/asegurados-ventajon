import crypto from "crypto";

// scrypt (nativo de Node, sin dependencias extra) con sal aleatoria por
// contraseña. Formato guardado: "<salt-hex>:<hash-hex>". Módulo aparte (sin
// depender de store.ts ni de agentAuth.ts) para que ambos puedan usarlo sin
// crear un import circular.
export function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString("hex")}`);
    });
  });
}

export function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return Promise.resolve(false);
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) return reject(err);
      const expected = Buffer.from(hashHex, "hex");
      resolve(expected.length === derived.length && crypto.timingSafeEqual(expected, derived));
    });
  });
}
