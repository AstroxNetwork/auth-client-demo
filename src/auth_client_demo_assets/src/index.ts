import { renderIndex } from './views';
import { Delegation, DelegationChain } from '@dfinity/identity';
import {
	blobFromHex,
	blobFromUint8Array,
	blobToUint8Array,
	derBlobFromBlob,
} from '@dfinity/candid';

const init = async () => {
	renderIndex();
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	const sessionPublicKey = urlParams.get('sessionPublicKey');
	const callbackUri = urlParams.get('callback_uri');

	let idpWindow: Window | null;
	let withHash =
		process.env.DFX_NETWORK === 'ic'
			? 'https://identity.ic0.app/#authorize'
			: process.env.LOCAL_II_CANISTER;

	const loginButton = document.getElementById('loginButton') as HTMLButtonElement;
	const retryButton = document.getElementById('retryButton') as HTMLButtonElement;
	const tips = document.getElementById('tips') as HTMLElement;
	const status = document.getElementById('status') as HTMLElement;

	window.onload = runListener;

	// empty string

	function runListener() {
		setTimeout(() => {
			idpWindow = window.open(withHash, 'idpWindow');
			loginButton.onclick = () => {
				loginButton.innerText = idpWindow ? 'Redirecting' : 'Click me to login';
				idpWindow = window.open(withHash, 'idpWindow');
			};
		}, 1000);

		let listener = window.addEventListener('message', function (event) {
			let message = event.data;
			switch (message.kind) {
				case 'authorize-ready': {
					// IDP is ready. Send a message to request authorization.
					let request = {
						kind: 'authorize-client',
						sessionPublicKey: blobToUint8Array(blobFromHex(sessionPublicKey!)),
						maxTimeToLive: undefined,
					};
					status.innerText = 'Authorization Required';
					tips.innerText = 'If this window is not redirecting, please click this button! ';
					loginButton.className = 'primary';
					loginButton.onclick = () => {
						loginButton.innerText = idpWindow ? 'Redirecting' : 'Click me to login';
						idpWindow = window.open(withHash, 'idpWindow');
					};
					retryButton.className = 'hide';
					idpWindow!.postMessage(request, withHash!);
					break;
				}
				case 'authorize-client-success': {
					idpWindow!.close();
					const delegations = message.delegations.map((signedDelegation) => {
						return {
							delegation: new Delegation(
								blobFromUint8Array(signedDelegation.delegation.pubkey),
								signedDelegation.delegation.expiration,
								signedDelegation.delegation.targets
							),
							signature: blobFromUint8Array(signedDelegation.signature),
						};
					});
					const delegationChain = DelegationChain.fromDelegations(
						delegations,
						derBlobFromBlob(blobFromUint8Array(message.userPublicKey))
					);
					const json = JSON.stringify(delegationChain.toJSON());

					window.removeEventListener('message', listener as any);
					status.innerText = 'Authorization Success';
					tips.innerText = 'If this window is not closed, please click this button! ';
					loginButton.innerText = 'Return To App';
					loginButton.className = 'primary';
					loginButton.onclick = () =>
						(window.location.href = `${callbackUri}?success=true&&json=` + json);
					retryButton.className = 'hide';
					window.location.href = `${callbackUri}?success=true&&json=` + json;
					break;
				}

				case 'authorize-client-failure': {
					idpWindow!.close();
					window.removeEventListener('message', listener as any);
					status.innerText = 'Authorization Failed';
					tips.innerText = 'Please choose following: ';
					loginButton.innerText = 'Return To App';
					loginButton.className = '';
					loginButton.onclick = () =>
						(window.location.href = `${callbackUri}?success=false&&json=` + message.text);
					retryButton.className = 'primary';

					retryButton.onclick = () => {
						idpWindow = window.open(withHash, 'idpWindow');
						runListener();
					};
					break;
				}

				default:
					break;
			}
		});
	}
};

init();
