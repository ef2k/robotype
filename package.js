Package.describe({
	summary: "Autocompletion tailored for Meteor."
});

Package.on_use(function (api) {
	api.use(['templating']);
	api.add_files(['robotype.html', 'robotype.js'], 'client');
});
