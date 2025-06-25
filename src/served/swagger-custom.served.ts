async function postData(url: string, data = {}) {
  const response = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'follow',
    referrerPolicy: 'no-referrer',
    body: JSON.stringify(data),
  });

  if (response.status >= 400) {
    throw new Error('invalid credentials');
  }
  return response.json();
}

// Function to get token from storage
function getExistingToken() {
  return (
    localStorage.getItem('access_token') ||
    sessionStorage.getItem('access_token')
  );
}

// Function to preauthorize UI with token
function preauthorizeToken(token) {
  setTimeout(() => {
    console.log('Access Token:', token);
    if (window.ui && typeof window.ui.preauthorizeApiKey === 'function') {
      console.log('Preauthorizing token...');
      window.ui.preauthorizeApiKey('bearer', token);
      console.log('preauth success');
    } else {
      console.error('preauthorizeApiKey is not a function on window.ui');
    }
  }, 1000);
}

const AUTH_CREDENTIALS = {
  email: 'admin@admin.com',
  password: 'Admin@123',
};

// Check for existing token first
const existingToken = getExistingToken();
if (existingToken) {
  console.log('Using existing token');
  preauthorizeToken(existingToken);
} else {
  console.log('No existing token, logging in');
  postData('/auth/login', AUTH_CREDENTIALS)
    .then((data) => {
      localStorage.setItem('access_token', data.access_token);
      preauthorizeToken(data.access_token);
    })
    .catch((e) => {
      console.error(`preauth failed: ${e}`);
    });
}
