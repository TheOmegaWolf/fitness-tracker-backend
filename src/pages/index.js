async function fetchUsers() {
  const response = await fetch('/api/userRoutes');
  const data = await response.json();
  console.log(data);
}
