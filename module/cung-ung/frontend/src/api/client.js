const BASE = "";

function getPhien() {
  return sessionStorage.getItem("phien") || "";
}

export async function api(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Phien": getPhien(),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.ok === false)) {
    const err = new Error(json?.error || `Loi ${res.status}`);
    err.maLoi = json?.ma_loi || null;
    err.status = res.status;
    err.data = json;
    throw err;
  }
  return json;
}

export async function apiBlob(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { "X-Phien": getPhien() } });
  if (!res.ok) throw new Error(`Không thể tải tệp (${res.status}).`);
  return res.blob();
}

export async function apiUpload(path, file) {
  const form = new FormData();
  form.append("tep", file);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST", headers: { "X-Phien": getPhien() }, body: form,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `Lỗi ${res.status}`);
  return json;
}

export function setPhien(token) {
  if (token) sessionStorage.setItem("phien", token);
  else sessionStorage.removeItem("phien");
}

export function coPhien() {
  return Boolean(getPhien());
}
