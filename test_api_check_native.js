const http = require('http');

const PORT = 3001;
const HOST = '127.0.0.1';

// Helper to prevent random numbers from colliding too often
const randomMobile = '9' + Math.floor(Math.random() * 900000000 + 100000000);

const logResult = (testName, success, message) => {
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${testName}: ${message}`);
};

const makeRequest = (path, method, body) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': body ? Buffer.byteLength(body) : 0
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = data ? JSON.parse(data) : {};
                    resolve({ status: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
};

async function runTests() {
    console.log(`Starting API Verification (Native HTTP) with Mobile: ${randomMobile}`);
    console.log('------------------------------------------------');

    // TEST 1: Send New Contact Message
    try {
        const body = JSON.stringify({
            hotelName: "Test Hotel",
            contactNumber: randomMobile,
            address: "Test Address",
            city: "Test City",
            pinCode: "123456",
            message: "Test Message",
            email: "test@example.com"
        });
        const res = await makeRequest('/contact/send-message', 'POST', body);

        if (res.status === 201 || res.status === 200) {
            logResult('Send New Message', true, 'Successfully created enquiry.');
        } else {
            logResult('Send New Message', false, `Status: ${res.status}, Msg: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        logResult('Send New Message', false, `Network Error: ${e.message}`);
    }

    // TEST 2: Duplicate Enquiry
    try {
        const body = JSON.stringify({
            hotelName: "Test Hotel 2",
            contactNumber: randomMobile,
            address: "Test Address 2",
            city: "Test City 2",
            pinCode: "123456",
            message: "Test Message 2"
        });
        const res = await makeRequest('/contact/send-message', 'POST', body);

        if (res.status === 400 && JSON.stringify(res.data).includes('already pending')) {
            logResult('Prevent Duplicate Enquiry', true, `Blocked: ${res.data.message}`);
        } else {
            logResult('Prevent Duplicate Enquiry', false, `Status: ${res.status}, Msg: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        logResult('Prevent Duplicate Enquiry', false, `Network Error: ${e.message}`);
    }

    // TEST 3: Login with Pending Request
    try {
        const body = JSON.stringify({ mobileNumber: randomMobile });
        const res = await makeRequest('/auth/send-otp', 'POST', body);

        if (res.status === 403 && JSON.stringify(res.data).includes('pending admin approval')) {
            logResult('Check Login Pending', true, `Blocked: ${res.data.message}`);
        } else {
            logResult('Check Login Pending', false, `Status: ${res.status}, Msg: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        logResult('Check Login Pending', false, `Network Error: ${e.message}`);
    }

    // TEST 4: Login with Unknown Number
    try {
        const unusedMobile = '8' + Math.floor(Math.random() * 900000000 + 100000000);
        const body = JSON.stringify({ mobileNumber: unusedMobile });
        const res = await makeRequest('/auth/send-otp', 'POST', body);

        if (res.status === 404) {
            logResult('Check Login Non-Existent', true, `Correctly returned 404.`);
        } else {
            logResult('Check Login Non-Existent', false, `Status: ${res.status}, Msg: ${JSON.stringify(res.data)}`);
        }
    } catch (e) {
        logResult('Check Login Non-Existent', false, `Network Error: ${e.message}`);
    }
}

runTests();
