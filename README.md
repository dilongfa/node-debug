# debug
A tiny debugging utility with no packages dependencies for Node.js

### Installation
```
npm i @dilongfa/debug
```

### Setup
```javascript
const debug = require('@dilongfa/debug')('app')
debug('Hello world!')
```

### Run
```
DEBUG=app node index.js
```
