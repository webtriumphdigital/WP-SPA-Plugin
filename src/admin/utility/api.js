class API {
	get baseURL() {
		const url = window?.td_spa_admin_vars?.rest?.url || '';
		return url.endsWith('/') ? url : url + '/';
	}

	get headers() {
		return {
			'Content-Type': 'application/json',
			'X-WP-Nonce': window?.td_spa_admin_vars?.rest?.nonce || '',
		};
	}

	async get(url) {
		const response = await fetch(this.baseURL + url, {
			method: 'GET',
			headers: this.headers,
		});
		const json = await response.json();
		return { data: json };
	}

	async post(url, data) {
		const response = await fetch(this.baseURL + url, {
			method: 'POST',
			headers: this.headers,
			body: JSON.stringify(data),
		});
		const json = await response.json();
		return { data: json };
	}
}

export default new API();
