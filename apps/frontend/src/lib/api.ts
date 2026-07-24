export const API_URL = "HTTP:127.0.0.1:8000/api";

export async function getProducts(){
  const response = await fetch(`${API_URL}/products`)
  return response.json()
}