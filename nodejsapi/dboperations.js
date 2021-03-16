var config = require('./dbconfig');
const sql = require('mssql');
var path = require("path");
var json2xls = require ('json2xls');
const TokenGenerator = require('uuid-token-generator');
var key = 'A pedido gentil da Conceição.'; 
var encryptor = require('simple-encryptor')(key);

const fs = require("fs");
const ordersFileRelativePath =  String("./Files/OrderFile/OrdersExcel.xlsx");
const tokgen = new TokenGenerator(); // Default is a 128-bit token encoded in base58


async function getOrders() {
    try {
        let pool = await sql.connect(config);
        let products = await pool.request().query("SELECT * FROM Orders");
        return products.recordsets;
    }
    catch (error){
        console.log(error);
    }
}

async function getOrdersFile() {
    try {
                
        let pool = await sql.connect(config);
        let products = await pool.request().query("SELECT * FROM Orders");

        var xls = json2xls(products.recordsets[0]);
        fs.writeFileSync(path.resolve(ordersFileRelativePath), xls, 'binary'  )

        return path.resolve(ordersFileRelativePath);              
    }
    catch (error){
        console.log(error);
    }
}


async function getOrder(orderId) {
    try {
        let pool = await sql.connect(config);
        let products = await pool.request()
            .input('input_parameter', sql.Int, orderId)
            .query("SELECT * FROM Orders where Id = @input_parameter");
        return products.recordsets;
    }
    catch (error){
        console.log(error);
    }
}

async function addOrder(order) {
    try {
        let pool = await sql.connect(config);
        let insertProduct = await pool.request()
            .input('Title', sql.NVarChar, order.Title)
            .input('Quantity', sql.Decimal, order.Quantity)
            .input('Message', sql.NVarChar, order.Message)
            .input('City', sql.NVarChar, order.City)
            //.execute('InsertOrders'); // case stored procedure
            .query("INSERT INTO Orders (Title, Quantity,Message,City) "+
                " VALUES ( @Title, @Quantity, @Message, @City );" +
                " SELECT IDENT_CURRENT('Orders') as IdAdded");
        return await getOrder(insertProduct.recordsets[0][0]["IdAdded"]);
    }
    catch (error){
        console.log(error);
    }
}

async function login(user){
    try {
        if (user.username === undefined || user.password === undefined)
            return -1;
        let pool = await sql.connect(config);
        let getUser = await pool.request()
            .input('User', sql.NVarChar, user.username)  
            .input('Password', sql.NVarChar, user.password)    
            .execute('CheckLogin');

        //pair (user, database) do not match
        if (getUser.recordsets[0][0].Count == '0') 
            return -2;        
        
        // update token
        let token = tokgen.generate();
        let updateToken = await pool.request()
            .input('user', sql.NVarChar, user.username)    
            .input('tokenExpiration', sql.DateTime, new Date(new Date().getTime()+(30 * 60 * 1000)).toUTCString())  // add 30 minutes to current time
            .input('token', sql.NVarChar, token)  
            .query("UPDATE Users SET token = @token, tokenExpiration = @tokenExpiration, isLogged = 1 where username = @user ");

        let session = {
            username: user.username,
            token: encryptor.encrypt(token)
        }
        return session;
        
    }
    catch (error){
        console.log(error);
    }

}

async function logout(session){
    try {
        if (session.username === undefined || session.token === undefined)
            return -1;
        let decryptToken = encryptor.decrypt(session.token)
        let pool = await sql.connect(config);
        let checkUserToken = await pool.request()
        .input('username', sql.NVarChar, session.username )  
        .input('token', sql.NVarChar, decryptToken)    
        .query("SELECT '1' as Count FROM Users WHERE username = @username and token = @token and isLogged = 1");

        //pair (user, token) do not match
        if (checkUserToken.recordsets[0][0] === undefined) 
            return -2;   
        let logOutUser = await pool.request()
        .input('username', sql.NVarChar, session.username )    
        .query("UPDATE Users SET isLogged = 0, token = null, tokenExpiration = null WHERE username = @username  ");
        
    } catch (error) {
        console.log(error);
    }

}

async function checkToken(session){
    try {
        if (session.username === undefined || session.token === undefined)
            return false;
        let decryptToken = encryptor.decrypt(session.token)
        let pool = await sql.connect(config);
        let checkUserToken = await pool.request()
        .input('username', sql.NVarChar, session.username )  
        .input('token', sql.NVarChar, decryptToken)    
        .query("SELECT '1' as Count FROM Users WHERE username = @username and token = @token and tokenExpiration > GETDATE() and isLogged = 1");
        //pair (user, token) do not match or token expired
        if (checkUserToken.recordsets[0][0] === undefined) 
            return false;   
        
        return true;
        
    } catch (error) {
        console.log(error);        
    }
    return false;

}

async function updateTokenExpiration(session){
    try {

        let pool = await sql.connect(config);
        let updateTokenDate = await pool.request()
        .input('username', sql.NVarChar, session.username )     
        .input('tokenExpiration', sql.DateTime, new Date(new Date().getTime()+(30 * 60 * 1000)).toUTCString())  // add 30 minutes to current time
        .query("UPDATE Users Set TokenExpiration = @tokenExpiration where username = @username");
        
    } catch (error) {
        console.log(error);        
    }
}

async function addUser(user) {
    try {
        if (user.username === undefined || user.password === undefined)
            return false;
        let pool = await sql.connect(config);
        let insertUser = await pool.request()
            .input('User', sql.NVarChar, user.username)
            .input('Password', sql.NVarChar, user.password)
            .execute("AddUser");
    }
    catch (error){
        console.log(error);
    }
}


async function getItems() {
    try {
        let pool = await sql.connect(config);
        let items = await pool.request().query("SELECT * FROM Item");
        return items.recordsets;
    }
    catch (error){
        console.log(error);
    }
}

async function getStock(itemCode) {
    try {
        let pool = await sql.connect(config);
        let stock = await pool.request()
            .input('itemCode', sql.NVarChar, itemCode)
            .execute('getItemStock');
        var json = [];
        let count = 0;
        stock.recordsets[0].forEach(element =>  {
            if (element.Row == '1') {
                let itemStockPerZone = {
                    WhsCode: element.WhsCode,
                    ZoneCode: element.ZoneCode,
                    Quantity: 1,
                    SerialNumbers: []
                }
                if (element.isSerial == '1') {
                    itemStockPerZone.SerialNumbers.push(element.SerialNumber)
                }
                json.push(itemStockPerZone);
            }
            else {
                json[count-1].Quantity +=1;
                if (element.isSerial == '1') { // get previous element info since its repeated
                    json[count-1].SerialNumbers.push(element.SerialNumber)
                }
                count--; // decrement to increment and stay same value
            }
            count++;       
        });
        return json;
    }
    catch (error){
        console.log(error);
    }
}



module.exports = {
    getOrders : getOrders,
    getOrdersFile : getOrdersFile,
    getOrder: getOrder,
    addOrder: addOrder,
    login: login,
    logout: logout,
    checkToken: checkToken,
    updateTokenExpiration: updateTokenExpiration,
    addUser: addUser,
    getItems: getItems,
    getStock: getStock
}