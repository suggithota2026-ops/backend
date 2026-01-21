const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3001/api'; // Use IP to avoid localhost IPv6 issues

// Helper to log results
const logResult = (testName, success, message) => {
    console.log(`[${success ? 'PASS' : 'FAIL'}] ${testName}: ${message}`);
};

const decodeError = (error) => {
    if (error.response) {
        return `Status: ${error.response.status}, Message: ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
        return `No response received. Code: ${error.code}. Is the server running?`;
    } else {
        return `Error: ${error.message}`;
    }
};

// Generate a random mobile number to ensure isolation
const randomMobile = '9' + Math.floor(Math.random() * 900000000 + 100000000); // 10 digit starting with 9

async function runTests() {
    console.log(`Starting API Verification Tests with Mobile: ${randomMobile}`);
    console.log('------------------------------------------------');

    // TEST 1: Send New Contact Message
    // Expect: 201 Created
    try {
        await axios.post(`${BASE_URL}/contact/send-message`, {
            hotelName: "Test Hotel",
            contactNumber: randomMobile,
            address: "Test Address",
            city: "Test City",
            pinCode: "123456",
            message: "Test Message",
            email: "test@example.com"
        });
        logResult('Send New Message', true, 'Successfully created enquiry.');
    } catch (error) {
        logResult('Send New Message', false, `Failed: ${decodeError(error)}`);
    }

    // TEST 2: Send Duplicate Contact Message (Same Number)
    // Expect: 400 Bad Request with "already pending" message
    try {
        await axios.post(`${BASE_URL}/contact/send-message`, {
            hotelName: "Test Hotel 2",
            contactNumber: randomMobile,
            address: "Test Address 2",
            city: "Test City 2",
            pinCode: "123456",
            message: "Test Message 2"
        });
        logResult('Prevent Duplicate Enquiry', false, 'Unexpected success (Should have failed).');
    } catch (error) {
        if (error.response?.status === 400 && error.response.data.message.includes('already pending')) {
            logResult('Prevent Duplicate Enquiry', true, `Correctly blocked: ${error.response.data.message}`);
        } else {
            logResult('Prevent Duplicate Enquiry', false, `Failed: ${decodeError(error)}`);
        }
    }

    // TEST 3: Login with Pending Request
    // Expect: 403 Forbidden with "request is pending" message
    try {
        await axios.post(`${BASE_URL}/auth/send-otp`, {
            mobileNumber: randomMobile
        });
        logResult('Check Login Pending', false, 'Unexpected success (Should have failed).');
    } catch (error) {
        if (error.response?.status === 403 && error.response.data.message.includes('pending admin approval')) {
            logResult('Check Login Pending', true, `Correctly blocked: ${error.response.data.message}`);
        } else {
            logResult('Check Login Pending', false, `Failed: ${decodeError(error)}`);
        }
    }

    // TEST 4: Login with Non-Existent Number (No Enquiry)
    // Expect: 404 Not Found
    const unusedMobile = '8' + Math.floor(Math.random() * 900000000 + 100000000);
    try {
        await axios.post(`${BASE_URL}/auth/send-otp`, {
            mobileNumber: unusedMobile
        });
        logResult('Check Login Non-Existent', false, 'Unexpected success (Should have failed).');
    } catch (error) {
        if (error.response?.status === 404) {
            logResult('Check Login Non-Existent', true, `Correctly returned 404 for unknown number.`);
        } else {
            logResult('Check Login Non-Existent', false, `Failed: ${decodeError(error)}`);
        }
    }
}

runTests();
