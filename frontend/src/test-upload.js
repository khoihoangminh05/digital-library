const axios = require('axios');

async function testUpload() {
  const email = `admin-${Date.now()}@example.com`;
  const password = 'securepassword123';
  const role = 'ADMIN';

  console.log('--- Step 1: Registering Admin User ---');
  try {
    const regRes = await axios.post('http://localhost:3002/auth/register', {
      email,
      password,
      role,
    });
    console.log('Registration Success:', regRes.data);
  } catch (err) {
    console.error('Registration Failed:', err.response?.data || err.message);
    return;
  }

  console.log('\n--- Step 2: Logging in to get JWT token ---');
  let token;
  try {
    const loginRes = await axios.post('http://localhost:3002/auth/login', {
      email,
      password,
    });
    token = loginRes.data.accessToken;
    console.log('Login Success! Token retrieved.');
  } catch (err) {
    console.error('Login Failed:', err.response?.data || err.message);
    return;
  }

  console.log('\n--- Step 3: Uploading a Book with dummy files ---');
  const form = new FormData();
  form.append('title', 'S3 Similarity Search Testing');
  form.append('author', 'Test Suite Admin');
  form.append('description', 'Diagnosing upload flow');
  form.append('category', 'Artificial Intelligence');
  
  // Dummy file blob
  const fileBlob = new Blob(['dummy-pdf-content'], { type: 'application/pdf' });
  form.append('file', fileBlob, 'test-book.pdf');

  // Dummy cover blob
  const coverBlob = new Blob(['dummy-cover-art'], { type: 'image/jpeg' });
  form.append('cover', coverBlob, 'test-cover.jpg');

  try {
    const uploadRes = await axios.post('http://localhost:3002/books', form, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('Upload Success!', uploadRes.data);
  } catch (err) {
    console.error('Upload Failed:', err.response?.data || err.message);
    if (err.response?.data?.message) {
      console.error('Detail Error:', err.response.data.message);
    }
  }
}

testUpload();
