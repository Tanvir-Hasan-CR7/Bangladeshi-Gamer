/**
 * Safely fetches JSON from a given URL.
 * Handles both JSON and text responses, checks response.ok before parsing,
 * and throws clear descriptive errors if non-JSON or HTTP errors are returned.
 */
export async function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error(`Network request failed to ${url}: ${netErr?.message || 'Unknown network error'}`);
  }

  const text = await response.text();
  let data: any = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Server returned non-JSON response (${response.status}): ${text.slice(0, 500)}`
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.details ||
      data?.message ||
      `Request failed with HTTP status ${response.status}`
    );
  }

  return data;
}
