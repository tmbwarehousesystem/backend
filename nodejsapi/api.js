const dboperations = require('./dboperations');
var edifact = require('./edifact')
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const helmet = require('helmet');



const swaggerOptions = {
    swaggerDefinition: {
        info: {
            title: 'TMB WMS',
            description: 'TMB Warehouse Management System'
        },
        servers: ["http://62.171.131.0/:8090"]
    },
    apis: ["api.js"],
}

const swaggerDocs = swaggerJsDoc(swaggerOptions);


var app = express();
var router = express.Router();


app.use(helmet());
app.use(require('sanitize').middleware);

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());


app.use('/api', router);

app.use('/api-docs', swaggerUi.serve,swaggerUi.setup(swaggerDocs));

router.use((request, response, next) => {
    //console.log('middleware');
    next();
});

/** 
* @swagger
    /login:
*    post:
*       description: use to login user
*       responses:
*           '400':
*            description: 'Login failure'
*           '200':
*            description: 'Login ok + json object with username and token'
*/
router.post('/login', function (request, response) {
    const user = { 
        username: request.body.username ,
        password : request.body.password
    }
    dboperations.login(user).then(result => {
        result < 0 ? response.sendStatus(400) : response.json(result);
    });
    
})

router.post('/logout', isAuthenticated, function (request, response) {
    const session = { 
        username: request.headers.username ,
        token : request.headers.token
    }
    dboperations.logout(session).then(result => {
        result < 0 ? response.sendStatus(400) : response.sendStatus(200);
    });
})

router.get('/ordermysql/:id', function (request, response) {
    dboperationsmysql.getOrder(request.params.id).then(result => {
        //console.log(result)
        response.json(result);
    });    
})

router.get('/orders', function (request, response) {
    dboperations.getOrders().then(result => {
        response.json(result[0]);
    });    
})

router.get('/orders/file', function (request, response) {
    dboperations.getOrdersFile().then(result => {
        response.download(result);
    })
})

router.get('/orders/:id', isAuthenticated, function (request, response) {
    dboperations.getOrder(request.params.id).then(result => {
        response.json(result[0]);
    })
})

router.post('/orders', isAuthenticated, function (request, response) {

    let order = {...request.body}

    dboperations.addOrder(order).then(result => {
        response.status(201).json(result[0]);
    })
})

router.post('/users', isAuthenticated, function (request, response) {

    let user = {...request.body}

    dboperations.addUser(user).then(result => {
        response.status(201);
    })
})

router.get('/items', function (request, response) {

    dboperations.getItems().then(result => {
        response.json(result[0]);
    })
})

router.get('/stock/:id', function (request, response) {
    console.log(2)
    dboperations.getStock(request.params.id).then(result => {
        response.json(result);
    })
})



function isAuthenticated(request, response, next) {

    const session = { 
        username: request.headers.username ,
        token : request.headers.token
    }
    
    dboperations.checkToken(session).then(result => {
        if (result === false) {
            next(new Error("Could not verify authentication."));
            return response.sendStatus(401);
        }     
        dboperations.updateTokenExpiration(session);
        next();
    });
}


var port = process.env.port || 8090;
app.listen(port);
console.log('Warehouse management API is running at ' + port);



