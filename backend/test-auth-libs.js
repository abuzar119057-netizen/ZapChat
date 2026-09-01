const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
    try {
        const password = 'password123';
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        console.log('Bcrypt hash:', hash);
        
        const match = await bcrypt.compare(password, hash);
        console.log('Bcrypt match:', match);
        
        const token = jwt.sign({ id: '123', email: 'test@test.com' }, process.env.JWT_SECRET || 'secret', {
            expiresIn: '30d',
        });
        console.log('JWT token:', token);
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
        console.log('JWT decoded:', decoded);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

test();
