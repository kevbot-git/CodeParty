'use strict';

import * as vscode from 'vscode';
import * as firebase from 'firebase';
import * as _ from 'lodash';

export class CodeParty {

	public static CONFIG_NAME: string = 'codeparty';

	private app: firebase.app.App;
	private db: firebase.database.Database;
	private ref: firebase.database.Reference;
	private config: vscode.WorkspaceConfiguration;

	public constructor(config: vscode.WorkspaceConfiguration) {
		this.config = config;
		if(typeof this.config === 'undefined') {
			throw new ConfigNotFoundError();
		}
		else {
			CodeParty.log('Configuration found.');
		}
	}

	public start(): void {
		CodeParty.log('Starting...');
		this.connect();
		this.registerListeners();
		vscode.window.showInformationMessage('CodeParty started!');
	}

	public disconnect(): void {
		CodeParty.log('Disconnected.');
        vscode.window.showInformationMessage('CodeParty disconnected.');
	}

	private connect(): void {
		CodeParty.log('Connecting...');
		let firebase_config = this.config.get<object>('firebase_config');

		_.forEach(_.values(firebase_config), (v) => {
			if(v == null) {
				throw new IncompleteConfigError();
			}
		});

		this.app = firebase.initializeApp(firebase_config);

		this.db = firebase.database(this.app);
		this.ref = this.db.ref('projects/' + 'test1'); // Temporary!
		CodeParty.log('Connected.');
	}

	private registerListeners(): void {
		CodeParty.log('Registering listeners...');
		vscode.workspace.onDidChangeTextDocument((event) => {
			CodeParty.log('Change:', event);
		});
		// this.ref.on('value', function(snapshot) {
		// 	CodeParty.log('new val: ' + snapshot.val().body);
		// });
		//	ref.set({
		// 		body: text
		// 	}).catch((err: any) => CodeParty.log(err));
		CodeParty.log('Listeners registered.');
	}

	public static log: any = function() {
    	var context = "[CodeParty]";
    	return Function.prototype.bind.call(console.log, console, context);
	}();

	public static error: any = function() {
    	var context = "[CodeParty] Error!";
    	return Function.prototype.bind.call(console.error, console, context);
	}();
}

export class ConfigNotFoundError extends Error {
	
	public constructor() {
		super('Configuration object ' + CodeParty.CONFIG_NAME + ' not complete in workspace settings.json.');
		this.name = 'ConfigNotFoundError';
	}

}

export class IncompleteConfigError extends Error {
	
	public constructor() {
		super('Firebase connection requires credentials object provided in settings.json.');
		this.name = 'IncompleteConfigError';
	}

}