const electron = require('electron')
// Module to control application life.
const app = electron.app

const { ipcMain } = require('electron');
	var my_http = require('http');
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow
var fs = require('fs');
const path = require('path')
const url = require('url')
const {Menu, Tray} = require('electron')

let mainWindow

var _tray = null
var atob = require("atob");

var http = require('http');

const https = require('https');
var ps = require('ps-node');
const WSS = require('ws');
var appPort = 0;
var appToken = 0;

const querystring = require('querystring');


var tokenBearer = '';
var me = false;


function findLoL(cb){
	 
	ps.lookup({
		command: 'LeagueClientUx.exe'
	}, function(err, resultList ) {
		if (err) {
			throw new Error( err );
		}
				
		if(resultList.length==0){
			findLoL();
		}

		resultList.forEach(function( process ){
			if( process ){
				var args = process.arguments;
				for(var a in args){
					var tmp = args[a].split("=");
					if(tmp[0]=="--app-port"){
						appPort = tmp[1];
					}
					if(tmp[0]=="--remoting-auth-token"){
						appToken = tmp[1];
					}
					
					cb();
					
				}
			}		
		});
	});
}

function joinRoom(code){
	findLoL(function(){
		var a = https.request({method: 'POST',hostname: "127.0.0.1",headers: {'Content-Type': 'application/json'},port: appPort,rejectUnauthorized: false,auth: "riot:"+appToken,path: '/lol-lobby/v1/tournaments/'+code+'/join'}, (resp) => {
			
			if(resp.statusCode==200){
				let data = '';

				resp.on('data', (chunk) => {
				    data += chunk;
				});

				resp.on('end', () => {
				});
			}else{
			}

		}).on("error", (err) => {
	 		console.log("Error: " + err.message);
		});
		a.write('');
		a.end();
	});
}


function getAPI(d,a,b){
	
	var a = https.request({method: 'GET',hostname: d,port: 443,rejectUnauthorized: false,path: a,headers: {Authorization: tokenBearer}}, (resp) => {
			
			console.log('statusCode:', resp.statusCode);
			
			  let data = '';

			  // A chunk of data has been recieved.
			  resp.on('data', (chunk) => {
			    	data+=chunk;
			  });

			  // The whole response has been received. Print out the result.
			  resp.on('end', () => {
			   
					b(JSON.parse(data));
			
			  });
			

		}).on("error", (err) => {
		  console.log("Error: " + err.message);
		})
		
		a.end();
}


function postAPI(d,a,p,b){
	var a = https.request({method: 'POST',hostname: d,port: 443,rejectUnauthorized: false,path: a,headers: {'Content-Type': 'application/json',Authorization: tokenBearer}}, (resp) => {
			
			console.log('statusCode:', resp.statusCode);
			
			  let data = '';

			  // A chunk of data has been recieved.
			  resp.on('data', (chunk) => {
			    	data+=chunk;
			  });

			  // The whole response has been received. Print out the result.
			  resp.on('end', () => {
			   	if(data=='OK'){
					b({status: 'OK'});
				}else{
					b(JSON.parse(data));
				}
			
			  });
			

		}).on("error", (err) => {
		  console.log("Error: " + err.message);
		})
		a.write(JSON.stringify(p));
		a.end();
}



var alertWindow = false;
var ignoreAlerts = {};


function checkEvents(){
	getAPI("majestic.battlefy.com",'/global-player-guide/tournaments/'+me._id+'/joined',function(b){
		for(var t in b){
			var tmp = b[t];
			
			var start = new Date(tmp.startTime);
			
			var diff = start.getTime() - new Date().getTime();
			
			if(diff>-1){
				if(diff<(35*60000)){
					getAPI("api.battlefy.com","/tournaments/"+tmp._id+"/permissions/player",function(r){
						if(r.canCheckin && r.isCheckedIn==false){
							if(!ignoreAlerts[tmp._id]){
								showAlert(tmp);
							}
						}
					});
					
					return;
				}
			}else if(diff>-(30*60000)){
				getAPI("api.battlefy.com","/tournaments/"+tmp._id+"/permissions/player",function(r){
						console.log(r)
						if(r.isCheckedIn==true){

							getAPI('api.battlefy.com','/tournaments/'+tmp._id+'/my-joined-team',function(team){	
								console.log(team);
								getAPI("api.battlefy.com","/me/tournaments/"+tmp._id+"/matches",function(r){	
										console.log(r);
										
										if(r.stages[0].hasMatchCheckin){
										
											for(var m in r.stages[0].matches){
												var match = r.stages[0].matches[m];
												console.log(match);
												if(!match.isComplete){
													
													if(match.top.readyAt && match.bottom.readyAt){													
														showJoin({tournament: r,stage: match,team: 'top'});
													}else if(match.top.team._id==team._id){
														if(!match.top.readyAt){
															//pede pronto
															console.log("PEDE PRONTO CIMA");
															
															showReady({tournament: r,stage: match,team: 'top'});
														}
													}else if(match.bottom.team._id==team._id){
														if(!match.bottom.readyAt){
															//pede pronto
															console.log("PEDE PRONTO BAIXO");
															showReady({tournament: r,stage: match,team: 'bottom'});
														}
													}
													
													return;
												}
											}
										}else{
											showJoin({tournament: r,stage: match,team: 'top'});
										}
								});
							});
						}
				});
				
				return;
			}
			
		}
	});
}



ipcMain.on('cancelar',function(e,m){
	
	ignoreAlerts[m._id] = 1;
	alertWindow.hide();
});



ipcMain.on('cancelarrodada',function(e,m){
	
	ignoreAlerts[m._id] = 1;
	alertWindow.hide();
});



ipcMain.on('cancelarjoin',function(e,m){
	
	ignoreAlerts[m._id] = 1;
	alertWindow.hide();
});



ipcMain.on('ready',function(e,m){
	//console.log(m);
	ignoreAlerts[m._id] = 1;
	alertWindow.hide();
	
		
	postAPI('api.battlefy.com','/matches/'+m.stage._id+'/match-checkin',{position: m.team},function(a){
		
		console.log(a);
		
	});
		

});




ipcMain.on('checkin',function(e,m){
	//console.log(m);
	ignoreAlerts[m._id] = 1;
	alertWindow.hide();
	postAPI('api.battlefy.com','/tournaments/'+m._id+'/check-in',{tournamentId: m._id},function(a){
		if(a.status=='check-in-player'){
			console.log('alert de checkin ok');
		}
	});
});


ipcMain.on('join',function(e,m){
	joinRoom(m.stage.lolHookUrl);
});


function showAlert(tmp){
	const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
	alertWindow = new BrowserWindow({x: (width-350),y: (height-230),width: 350, height: 220,frame: false,transparent: false,show:false})

	alertWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'html/alert.html'),
		protocol: 'file:',
		slashes: true
	}));
	
	alertWindow.webContents.on('did-finish-load', () => {
		alertWindow.webContents.send('info', tmp);
		
		
		alertWindow.show();
	})
}


function showReady(tmp){
	const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
	alertWindow = new BrowserWindow({x: (width-350),y: (height-230),width: 350, height: 220,frame: false,transparent: false,show:false})

	alertWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'html/ready.html'),
		protocol: 'file:',
		slashes: true
	}));
	
	alertWindow.webContents.on('did-finish-load', () => {
		alertWindow.webContents.send('info', tmp);
		
		
		alertWindow.show();
	})
}



function showJoin(tmp){
	const { width, height } = electron.screen.getPrimaryDisplay().workAreaSize;
	alertWindow = new BrowserWindow({x: (width-350),y: (height-230),width: 350, height: 220,frame: false,transparent: false,show:false})

	alertWindow.loadURL(url.format({
		pathname: path.join(__dirname, 'html/join.html'),
		protocol: 'file:',
		slashes: true
	}));
	
	alertWindow.webContents.on('did-finish-load', () => {
		alertWindow.webContents.send('info', tmp);
		
		
		alertWindow.show();
	})
}


function initSession(){
	getAPI("api.battlefy.com",'/me',function(a){
				me = a;
				
			const contextMenu = Menu.buildFromTemplate([
					{label: me.email,enabled: false},
					{label: '',type: 'separator'},
				{label: 'Sair',click: function(){  app.quit() }}
			])
			_tray.setContextMenu(contextMenu);
				
				
			joinRoom('BR04639-7aead308-8847-43c9-b2e3-b095bc42082d');
				setInterval(checkEvents,15000);
			});
}


function createWindow () {
	
	
	_tray = new Tray('battlefy.png')
	const contextMenu = Menu.buildFromTemplate([
			{label: 'Log-in não realizado',enabled: false},
			{label: '',type: 'separator'},
		{label: 'Sair',click: function(){  app.quit() }}
	])
	_tray.setContextMenu(contextMenu);
	
	if(fs.existsSync("session.bf")){
		tokenBearer = fs.readFileSync('session.bf');
		
		initSession();
	}else{
	
		mainWindow = new BrowserWindow({width: 450,movable: true, height: 700,frame: false,transparent: false})

		mainWindow.loadURL("https://battlefy.com/account/login");


		mainWindow.on('closed', function () {
			mainWindow = null
		})
		
		mainWindow.on('did-navigate-in-page',function(e,u,a,b){
			
			console.log("B: "+u);
		});
		
		
		
		mainWindow.webContents.on('did-navigate',function(e,u,a,b){
			
			//console.log("A: "+u);
			
			if(u.match("callback#")){
				
				var token = querystring.parse(u.split("callback#")[1]);
				
				console.log(token);
				
				
				tokenBearer = 'Bearer '+token.id_token;
				
							
							
				fs.writeFile('session.bf', tokenBearer, function (err) {
					if (err) 
						return console.log(err);
					console.log('Wrote Hello World in file helloworld.txt, just check it');
				});
				
				initSession();
				
				mainWindow.hide();
			}
		});
		
		
		

		
		mainWindow.webContents.on('new-window',function(e,u){
			
			e.preventDefault();
			
			
			mainWindow.loadURL(u);
			
			
		});
	}
					
}



app.on('ready', createWindow)


