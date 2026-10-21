use serde_json::{json, Value};

/// Proxy del launcher hacia la API de SteamDeckRepo (evita el CSP del
/// renderer). Equivale a `steamdeckrepo-fetch-posts` de Electron.
#[tauri::command]
pub async fn steamdeckrepo_fetch_posts() -> Value {
  let client = match reqwest::Client::builder()
    .user_agent("HASHI/1.0")
    .timeout(std::time::Duration::from_secs(20))
    .build()
  {
    Ok(client) => client,
    Err(err) => return json!({ "success": false, "error": err.to_string() }),
  };

  let response = match client.get("https://steamdeckrepo.com/api/posts/all").send().await {
    Ok(response) => response,
    Err(err) => return json!({ "success": false, "error": err.to_string() }),
  };

  if response.status().as_u16() == 429 {
    return json!({ "success": false, "error": "Rate limit exceeded" });
  }
  if !response.status().is_success() {
    let status = response.status();
    let text = status.canonical_reason().unwrap_or("");
    return json!({ "success": false, "error": format!("{} {}", status.as_u16(), text) });
  }

  match response.json::<Value>().await {
    Ok(data) => {
      let posts = data.get("posts").cloned().unwrap_or_else(|| json!([]));
      json!({ "success": true, "posts": posts })
    }
    Err(err) => json!({ "success": false, "error": err.to_string() }),
  }
}
