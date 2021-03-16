/*
const intervalObj = setInterval(() => {
    console.log('interviewing the interval');
  }, 5000);
  

var edi = require('edi-parser');
const FILE_PATH = 'C:/Users/edgar/Desktop';

fs = require('fs')
fs.readFile('C:/Users/edgar/Downloads/edi_insdes_d_96a_en_ean001_20210304071411.edi', 'ascii', function (err,data) {
  if (err) {
    return console.log(err);
  }
    //console.log(data);

    edi()
    .fromPath(FILE_PATH+'/sample.in') 
    .toPath(FILE_PATH+'/sample.out')
    .transform(function(data){
        //data.unshift(data.pop());
        return data;
    })
    .on('data',function(data,index){
        console.log('#'+index+' '+JSON.stringify(data));
    })
    .on('end',function(count){
        console.log('Number of lines: '+count);
    })
    .on('error',function(error){
        console.log(error.message);
    });
    
})
*/



