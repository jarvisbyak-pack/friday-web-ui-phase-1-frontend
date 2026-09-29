import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function assertSafeUrl(input: string): URL {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS URLs are supported.");
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")) {
    throw new Error("Local network hosts are not allowed.");
  }

  const literal = isIP(hostname);
  if (literal) {
    if (
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("169.254.")
    ) {
      throw new Error("Private or link-local addresses are not allowed.");
    }
    const octets = hostname.split(".").map(Number);
    if (octets.length === 4 && octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) {
      throw new Error("Private addresses are not allowed.");
    }
  }

  return url;
}

export class WebFetchService {
  async fetchText(input: string, timeoutMs = 15000): Promise<{
    url: string;
    status: number;
    contentType: string;
    text: string;
  }> {
    const url = assertSafeUrl(input);
    const addresses = await lookup(url.hostname, { all: true });
    for (const address of addresses) {
      if (isIP(address.address) === 4) {
        const octets = address.address.split(".").map(Number);
        if (
          octets[0] === 10 ||
          (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) ||
          (octets[0] === 192 && octets[1] === 168) ||
          octets[0] === 127 ||
          octets[0] === 169 && octets[1] === 254
        ) {
          throw new Error("Resolved host points to a private or link-local address.");
        }
      } else if (address.address === "::1" || address.address.startsWith("fc") || address.address.startsWith("fd")) {
        throw new Error("Resolved host points to a private IPv6 address.");
      }
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(Math.min(Math.max(timeoutMs, 1000), 30000)),
      redirect: "manual",
      headers: { "User-Agent": "Friday-Agent/0.1" }
    });
    if (response.status >= 300 && response.status < 400) throw new Error("Redirect responses are not allowed by the web fetch tool.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 2000000) throw new Error("Web response exceeds the 2 MB limit.");

    return {
      url: response.url,
      status: response.status,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      text: new TextDecoder().decode(bytes)
    };
  }
}
