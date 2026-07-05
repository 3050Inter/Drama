
export async function addTransaction(data) {
  return fetch("YOUR_APPS_SCRIPT_URL", {
    method: "POST",
    body: JSON.stringify({
      action: "add",
      data
    })
  });
}
