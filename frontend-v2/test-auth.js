import axios from 'axios';
async function test() {
  try {
    const loginRes = await axios.post('http://localhost:8080/api/auth/login', {
      credential: 'testuser1', password: 'Password123'
    });
    console.log(loginRes.data);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
test();
