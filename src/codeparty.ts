'use strict';

import * as vscode from 'vscode';
import * as firebase from 'firebase';
import * as _ from 'lodash';

export class CodeParty {

	public static CONFIG_NAME: string = 'codeparty';

	private app: firebase.app.App;
	private auth: firebase.auth.Auth;
	private db: firebase.database.Database;
	private ref: firebase.database.Reference;
	private user: firebase.User;

	private config: vscode.WorkspaceConfiguration;
	private mainStatusBarItem: vscode.StatusBarItem;

	public constructor(config: vscode.WorkspaceConfiguration) {
		this.config = config;
		this.registerStatusBarItems();
		if(typeof this.config === 'undefined') {
			throw new ConfigNotFoundError();
		}
		else {
			CodeParty.log('Configuration found.');
		}
	}

	public start(): void {
		CodeParty.log('Starting...');
		this.connect().then(() =>
			this.checkAuthentication()
		).then(() => {
			this.registerListeners();
		});
	}

	public disconnect(): void {
		CodeParty.log('Disconnected.');
        vscode.window.showInformationMessage('CodeParty disconnected.');
	}

	private authenticate(): Thenable<any> {
		CodeParty.log('Authenticating...');
		let _auth = this.auth = this.app.auth();

		let actions: { title: string, action: () => Thenable<any> }[] = [
			{ title: 'Sign in with existing account', action: () => {
				return this.signIn(_auth);
			} },
			{ title: 'Sign up for CodeParty', action: () => {
				return vscode.window.showInformationMessage('Coming soon!');
			}}
		];

		return vscode.window.showQuickPick(_.map(actions, 'title')).then((choice) => 
			_.find(actions, (action) => {
				return action.title === choice;
			}).action()
		);
	}

	private signIn(_auth: firebase.auth.Auth): Thenable<void> {

		return new Promise<{ email: string, password: string }>((resolve, reject) => {
			CodeParty.log('Showing sign-in...');
			vscode.window.showInputBox(
				<vscode.InputBoxOptions> {
					prompt: '[CodeParty] Enter your email:',
					placeHolder: 'e.g. someone@example.com',
					ignoreFocusOut: true
				}
			).then((email) => {
				vscode.window.showInputBox(<vscode.InputBoxOptions> {
					prompt: '[CodeParty] Password for ' + email + ':',
					password: true,
					ignoreFocusOut: true
				}).then((password) => {
					resolve({ email: email, password: password });
				});
			});
		}).then((credentials) => _auth.signInWithEmailAndPassword(
			credentials.email,
			credentials.password
		).then((user) => {
			CodeParty.log('Welcome, ' + ((user.displayName)? user.displayName: user.email) + '!')
		})).catch((error) => {
			CodeParty.error(error);
		});
	}

	private checkAuthentication(): Thenable<void> {
		CodeParty.log('Checking authentication...');

		// if(this.auth === null) {
			
		// }

		return this.authenticate().then(() => {
			CodeParty.log('Authenticated!');
		});
	}

	private connect(): Thenable<void> {
		return new Promise<void>((resolve, reject) => {
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
			resolve();
		});
	}

	private getAuth(): firebase.auth.Auth {
		return this.auth;
	}

	private registerStatusBarItems(): void {
		this.mainStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
		this.mainStatusBarItem.text = 'Test!';
		this.mainStatusBarItem.show();
	}

	private registerListeners(): void {
		CodeParty.log('Registering listeners...');
		vscode.workspace.onDidChangeTextDocument(this.onEditEvent);
		CodeParty.log('Listeners registered.');
	}

	private onEditEvent(event: vscode.TextDocumentChangeEvent) {
		CodeParty.log('Change made to ' + vscode.workspace.asRelativePath(event.document.uri) + ':', event);
		if(Utils.documentIsInProjectDir(event.document)) { // Only work with files in the workspace's open folder
			// 	filename: vscode.workspace.asRelativePath(event.document.uri)
			CodeParty.log('Text: ' + event.document.getText());
		}
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

export class Utils {
	public static documentIsInProjectDir(document: vscode.TextDocument): boolean {
		return document.uri.fsPath.startsWith(vscode.workspace.rootPath);
	}
}