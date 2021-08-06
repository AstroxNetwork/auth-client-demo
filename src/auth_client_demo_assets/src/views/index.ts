import { html, render } from 'lit-html';
const content = html`<div class="container">
	<h1 id="status">Authorization Required</h1>
	<p id="tips">If this window is not redirecting, please click this button!</p>
	<button type="button" id="retryButton" class="hide">Retry</button>
	<button type="button" id="loginButton" class="primary">Click Me To Login</button>
</div>`;

export const renderIndex = async () => {
	render(content, document.getElementById('pageContent') as HTMLElement);
};
