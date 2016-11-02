var express = require('express');
var app = express();

var credentials = require('./lib/credentials.js');

var fs = require('fs');

//创建子域
/*
* 使用子域名
 因为 API 实质上是不同于网站的,所以很多人都会选择用子域将 API 跟网站其余部 分分开。这十分容易,我们重构这个例子,
 将 meadowlarktravel.com/api 改成用 api. meadowlarktravel.com。
 首先确保 vhost 中间件已经装好了(npm install --save vhost)。在开发环境中,你可能 没有自己的域名服务器(DNS),
 所以我们需要用一种手段让 Express 相信你连接了一个子 域。为此需要向hosts文件中添加一条记录。在Linux和OS X系统中,
 hosts文件是/etc/ hosts;在 Windows 中是 %SystemRoot%\system32\drivers\etc\hosts。如果测试服务器的 IP
 地址是 192.168.0.100,则在 hosts 文件中添加下面这行记录:
 192.168.0.100   api.meadowlark
 如果你是直接在开发服务器上工作,可以用 127.0.0.1(相当于本地服务器)代替真实的 IP 地址。现在我们直接连入新的 vhost
 创建子域:
 app.use(vhost('api.*', rest.rester(apiOptions));
 还需要修改上下文:
 var apiOptions = { context: '/',
 domain: require('domain').create(),
 };
 全都在这里了。现在所有通过 rest.VERB 定义的 API 路由都可以在 api 子域上调用了。
* */

//子域名路由
var vhost = require('vhost');
var admin = express.Router();
app.use(vhost('admin.*', admin));
admin.get('/', function(req, res){
	res.render('admin/home')
});

//https://www.npmjs.org/package/cors详细用法
//跨域资源共享(CORS),CORS 是通过 Access-Control-Allow-Origin 响应头实现 的。
// 在 Express 程序中最容易的实现方式是用 cors 包(npm install --save cors)
//可以限定哪些api使用
//app.use('api', require('cors')());


//设置handlebars视图引擎(设置默认布局,文件名后缀)
var handlebars = require('express-handlebars').create({
	defaultLayout:'main',
	extname:'.hbs',
	//添加一个叫做section的辅助方法,用来实现向某个元素中添加东西,或是插入一段使用 jQuery 的 <script> 脚本
	helpers: {
		section: function(name, options){
			if(!this._section) this._section = {};
			this._section[name] = options.fn(this);
			return null
		},
		//添加了一个 Handlebars 辅助函数 static,让它调用静态资源映射器
		static: function(name){
			return require('./lib/static.js').map(name);
		}
	}
});
app.engine('hbs', handlebars.engine);
app.set('view engine', 'hbs');
app.disable('x-powered-by');
//设置端口号(如果配置了环境端口,会优先选择)
app.set('port', process.env.PORT || 3000);

//静态资源目录
app.use(express.static(__dirname + '/public'));

//是否展示测试
app.use(function(req, res, next){
	res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
	next();
});


app.use(require('body-parser')());


//连接数据库
var mongoose = require('mongoose');
var opts = {
	server: {
		socketOptions: {keepAlive: 1}
	}
};

switch (app.get('env')){
	case 'development':
		mongoose.connect(credentials.mongo.development.connectionString, opts);
		break;
	case 'production':
		mongoose.connect(credentials.mongo.production.connectionString, opts);
		break;
	default:
		throw new Error('Unknown execution environment: ' + app.get('env'));
}


//cookie
app.use(require('cookie-parser')(credentials.cookieSecret));
//session
//app.use(require('express-session')());

//使用mongodb存储session
var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({
	url: credentials.mongo[app.get('env')].connectionString
});
app.use(require('express-session')({
	store: sessionStore,
	resave: false,
	saveUninitialized: false,
	secret: credentials.cookieSecret
}));


app.use(function(req, res, next){
	//如果会话中有 flash 对象,将它添加到上下文中。即显消息显示过一次之后,
	// 我们就要从会话中去掉它,以免它在下一次请求时再次显示
	res.locals.flash = req.session.flash;
	delete req.session.flash;
	next();
});

//实现授权机制。比如说我们的用户授权代码会设定一个会话变量
// req.session.authorized,则可以像下面这样做一个可重复
// 使用的授权过滤器:
function authorize(req, res, next){
	if(req.session.authorized) return next();
	res.render('not-authorized');
}
app.get('/secret', authorize, function(){
	res.render('secret');
});
app.get('/sub-rosa', authorize, function(){
	res.render('sub-rosa');
});

var Vacation = require('./models/vacation.js');
//添加初始(假)数据(find方法是查找数据,这里第一次查找结果为空,通过save方法向数据库添加数据)
Vacation.find(function(err, vacations){
	if(vacations.length) return;
	new Vacation({
		name: 'Hood River Day Trip',
		slug: 'hood-river-day-trip',
		category: 'Day Trip',
		sku: 'HR199',
		description: 'Spend a day sailing on the Columbia and ' +
		'enjoying craft beers in Hood River!',
		priceInCents: 9995,
		tags: ['day trip', 'hood river', 'sailing', 'windsurfing', 'breweries'],
		inSeason: true,
		maximumGuests: 16,
		available: true,
		packagesSold: 0
	}).save(function(err, a){
		if (err) return res.send(500, 'Error occurred: database error.');
		res.json({id: a._id})
	});

	new Vacation({
		name: 'Oregon Coast Getaway',
		slug: 'oregon-coast-getaway',
		category: 'Weekend Getaway',
		sku: 'OC39',
		description: 'Enjoy the ocean air and quaint coastal towns!',
		priceInCents: 269995,
		tags: ['weekend getaway', 'oregon coast', 'beachcombing'],
		inSeason: false,
		maximumGuests: 8,
		available: true,
		packagesSold: 0
	}).save();

	new Vacation({
		name: 'Rock Climbing in Bend',
		slug: 'rock-climbing-in-bend',
		category: 'Adventure',
		sku: 'B99',
		description: 'Experience the thrill of climbing in the high desert.',
		priceInCents: 289995,
		tags: ['weekend getaway', 'bend', 'high desert', 'rock climbing'],
		inSeason: true,
		requiresWaiver: true,
		maximumGuests: 4,
		available: false,
		packagesSold: 0,
		notes: 'The tour guide is currently recovering from a skiing accident.'
	}).save();
});

app.post('/download', function(req, res){
	//console.log(123);
	res.download('./package.json', function(err){
		console.log(err)
	})
	//res.sendFile(__dirname + '/package.json', {'headers' : {
	//	'Content-Disposition': 'attachment; filename="package.json"'
	//}} , function(err){
	//	console.log(err)
	//})
});

app.get('/', function(req, res){

	//读取cookie
	var monster = req.cookies.monster;
	var signedMonster = req.signedCookies.monster;

	//删除cookie
	res.clearCookie('monster');

	//设置cookie
	res.cookie('monster', 'nom nom');
	//设置签名cookie
	res.cookie('signed_monster', 'nom nom', {signed: true});

	res.render('home', {layout: 'main'});//可以指定模版,如果不需要可以赋值null
});

//使用mongodb存储session
app.get('/set-currency/:currency', function(req, res){
	req.session.currency = req.params.currency;
	return res.redirect(303, '/vacations');
});
function convertFromUSD(value, currency){
	switch(currency){
		case 'USD': return value * 1;
		case 'GBP': return value * 0.6;
		case 'BTC': return value * 0.0023707918444761;
		default: return NaN;
	}
}

//模型克隆
//var underscore = require('underscore');
//var vm = _.omit(customer, 'salesNotes');//克隆并忽略某属性
////添加属性
//return _.extend(vm, {
//	name: smartJoin([vm.firstName, vm.lastName]),
//	fullAddress: smartJoin([
//		customer.address1,
//		customer.address2,
//		customer.city + ', ' +
//		customer.state + ' ' +
//		customer.zip
//	], '<br>'),
//	orders: customer.getOrders().map(function (order) {
//		return {
//			orderNumber: order.orderNumber,
//			date: order.date,
//			status: order.status,
//			url: '/orders/' + order.orderNumber,
//		}
//	})
//});

//获取数据库中数据
app.get('/vacations', function(req, res){
	//available: true 是筛选条件
	Vacation.find({available: true}, function(err, vacations){
		var context = {
			currency: req.session.currency || 'USD',
			//只传递需要的信息
			vacations: vacations.map(function(vacation){
				return {
					sku: vacation.sku,
					name: vacation.name,
					description: vacation.description,
					inSeason: vacation.inSeason,
					//price: vacation.getDisplayPrice(),
					price: convertFromUSD(vacation.priceInCents/100, currency),
					qty: vacation.qty
				}
			})
		};

		switch(context.currency){
			case 'USD': context.currencyUSD = 'selected'; break;
			case 'GBP': context.currencyGBP = 'selected'; break;
			case 'BTC': context.currencyBTC = 'selected'; break;
		}
		res.render('vacations', context);
	})
});

//返季提醒
var VacationInSeasonListener = require('./models/vacationInSeasonListener.js');
app.get('/notify-me-when-in-season', function(req, res){
	res.render('notify-me-when-in-season', {sku: req.query.sku});
});
app.post('/notify-me-when-in-season', function(req, res){
	VacationInSeasonListener.update(
		{email: req.body.email},
		{$push: {skus: req.body.sku}},
		{upsert: true},
		function(err){
			if (err){
				console.log(err.stack);
				req.session.flash = {
					type: 'danger',
					intro: 'Ooops!',
					message: 'There was an error processing your request.'
				};
				return res.redirect(303, '/vacations');
			}
			req.session.flash = {
				type: 'success',
				intro: 'Thank you!',
				message: 'You will be notified when this vacation is in season.'
			};
			return res.redirect(303, '/vacations');
		}
	)
});

app.get('/jquerytest', function(req, res){
	res.render('jquerytest');
});
app.get('/data/jquerytest', function(req, res){
	res.json({
		animal: 'squirrel',
		bodyPart: 'tail',
		adjective: 'bushy',
		noun: 'heck'
	})
});

//表单
app.get('/newsletter', function(req, res){
	res.render('newsletter', {csrf: 'CSRF token goes here'})
});

app.post('/newsletter', function(req, res){

	var name = req.body.name || '', email = req.body.email || ''; // 输入验证

	if(!email.match('@')) {
		if(req.xhr) return res.json({ error: 'Invalid name email address.' });
		req.session.flash = {
			type: 'danger',
			intro: 'Validation error!',
			message: 'The email address you entered was not valid.'
		};
		return res.redirect(303, '/thank-you');
	}

	//warning: error
	new NewsletterSignup({ name: name, email: email}).save(function(err){
		if(err) {
			if(req.xhr) return res.json({ error: 'Database error.' });
			req.session.flash = {
				type: 'danger',
				intro: 'Database error!',
				message: 'There was a database error; please try again later.'
			};
			return res.redirect(303, '/thank-you');
		}
		if(req.xhr) return res.json({ success: true });
		req.session.flash = {
			type: 'success',
			intro: 'Thank you!',
			message: 'You have now been signed up for the newsletter.'
		};
		return res.redirect(303, '/thank-you');
	});
});

app.post('/process', function(req, res){

	//判断是否是ajax请求
	console.log('is ajax?'+req.xhr);

	//获取表单信息
	console.log('Form (from querystring):'+req.query.form);
	console.log('CSRF token (from hide form field):'+req.body._csrf);
	console.log('Name (from visible form field):'+req.body.name);
	console.log('Email (from visible form field):'+req.body.email);

	//重定向
	req.xhr ? res.send({success:true}) : res.redirect(303, '/thank-you');
});
/*
* 在这种情况下使用 303(或 302)重定向,而不是 301 重定向,这一点非常 重要。
* 301 重定向是“永久”的,意味着浏览器会缓存重定向目标。
* 如果使 用 301 重定向并且试图第二次提交表单,浏览器会绕过整个 /process 处理程
* 序直接进入/thank you页面,因为它正确地认为重定向是永久性的。
* 另一方 面,303 重定向告诉浏览器“是的,你的请求有效,可以在这里找到响应”,
* 并且不会缓存重定向目标。
* */
app.get('/thank-you', function(req, res){
	res.render('thank-you')
});

//上传文件
var formidable = require('formidable');
app.get('/contest/vacation-photo', function(req,res){
	var now = new Date();
	res.render('contest/vacation-photo', {
		year: now.getFullYear(),
		month: now.getMonth()
	})
});

//存放目录
var dataDir = __dirname + '/data';
var vacationPhotoDir = dataDir + '/vacation-photo';

fs.existsSync(dataDir) || fs.mkdirSync(dataDir);
fs.existsSync(vacationPhotoDir) || fs.mkdirSync(vacationPhotoDir);

app.post('/contest/vacation-photo/:year/:month', function(req, res){
	var form = new formidable.IncomingForm();

	form.parse(req, function(err, fields, files){
		if (req.xhr && err) return res.redirect(303, '/error');

		if (err) {
			res.session.flash = {
				type: 'danger',
				intro: 'Oops!',
				message: 'There was an error processiong your submission.' + 'Pelase tyr again.'
			};
			return res.redirect(303, '/contest/vacation-photo');
		}

		var photo = files.photo;
		var dir = vacationPhotoDir + '/' + Date.now();
		var path = dir + '/' + photo.name;
		//根据时间戳创建唯一文件夹
		fs.mkdirSync(dir);
		//因为phot.path是一个临时文件名,所以要重命名
		fs.renameSync(photo.path, path);

		saveContestEntry('vacation-photo', fields.email, req.params.year, req,params.month, path);

		req.session.flash = {
			type: 'success',
			intro: 'Good luck!',
			message: 'You have been entered into the contest'
		};

		return res.redirect(303, '/contest/vacation-photo/entries');
	})
});

function saveContestEntry(contestName, email, year, month, photoPath){

}

/*
* 云存储越来越流行了,我强烈建议你利用这些便宜又好用的服务。这里有一个将文件保存
 到亚马逊 S3 账号中的例子,看看多容易吧:
 var filename = 'customerUpload.jpg';
 aws.putObject({
 ACL: 'private',
 Bucket: 'uploads',
 Key: filename,
 Body: fs.readFileSync(__dirname + '/tmp/ + filename)
 });
 要了解更多信息,请查阅 A WS SDK 文档(http://aws.amazon.com/sdkfornodejs)。 还有一个用微软 Azure 完成相同任务的例子:
 var filename = 'customerUpload.jpg';
 var blobService = azure.createBlobService(); blobService.putBlockBlobFromFile('uploads', filename, __dirname +
 '/tmp/' + filename);
 要了解更多信息,请查阅微软 Azure 文档(http://azure.microsoft.com/zh-cn/develop/nodejs/)。
* */

////jQuery文件上传
//var jqupload = require('jquery-file-upload-middleware');
//app.use('/upload', function(req, res, next){
//	var now = Date.now();
//	jqupload.fileHandler({
//		uploadDir: function(){
//			return __dirname + '/public/uploads/' + now;
//		},
//		uploadUrl: function(){
//			return '/uploads/' + now;
//		}
//	})(req, res, next)
//});


//var fortune = require('./lib/fortune.js');
//app.get('/about', function(req, res){
//	res.render('about', {
//		fortune: fortune.getFortune(),
//		pageTestScript: '/qa/tests-about.js'
//	});
//});

//路由分组
require('./routers.js')(app);

app.get('/tours/hood-river', function(req, res){
	res.render('tours/hood-river');
});
app.get('/tours/request-group-rate', function(req, res){
	res.render('tours/request-group-rate');
});

//自动渲染
var autoViews = {};
var fs = require('fs');
app.use(function(req,res,next){
	var path = req.path.toLowerCase();
// 检查缓存;如果它在那里,渲染这个视图
	if(autoViews[path]) return res.render(autoViews[path]);
// 如果它不在缓存里,那就看看有没有 .handlebars 文件能匹配
	if(fs.existsSync(__dirname + '/views' + path + '.handlebars')){
		autoViews[path] = path.replace(/^\//, '');
		return res.render(autoViews[path]);
	}
// 没发现视图;转到 404 处理器
	next();
});

function getWeatherData(){
	return {
		locations: [
			{
				name: 'Portland',
				forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
				weather: 'Overcast',
				temp: '54.1 F (12.3 C)'
			},
			{
				name: 'Bend',
				forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
				weather: 'Partly Cloudy',
				temp: '55.0 F (12.8 C)'
			},
			{
				name: 'Manzanita',
				forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
				iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
				weather: 'Light Rain',
				temp: '55.0 F (12.8 C)'
			}
		]
	};
}
app.use(function(req, res, next){
	if (!res.locals.partials) res.locals.partials = {};
	res.locals.partials.weather = getWeatherData();
	next();
});


//#warning: error

//使用REST插件,自动给所有 API 调用加上前缀“/api”
//https://github.com/imrefazekas/connect-rest
var Rest = require('connect-rest');

//api配置
var apiOptions = {
	context: '/api',
	//指定一个域,这样我们可以孤立 API 错误并 采取相应的行动。
	// 当在那个域中检测到错误时,connect-rest 会自动发送一个响应码 500,
	// 你所要做的只是记录日志并关闭服务器。
	domain: require('domain').create()
};
//错误处理
apiOptions.domain.on('error', function(err){
	console.log('API domain error.\n', err.stack);
	setTimeout(function(){
		console.log('Server shutting dowm after API domain error.');
		process.exit(1);
	}, 5000);
	server.close();
	var worker = require('cluster').worker;
	if (worker) worker.disconnect();
});

var rest = Rest.create(apiOptions);

//将API连入管道
app.use(rest.processRequest());

//req(跟平常一样); content内容对象,是请求被解析的主体;cb回调函数,可以用于异步 API 的调用
rest.get('/attractions', function(req, content, cb){
	Attraction.find({ approved: true}, function(err, attractions){
		if(err) return cb({ error: 'Internal error.' });
		cb(null, attractions.map(function(a){
			return {
				name: a.name,
				description: a.description,
				location: a.location
			};
		}));
	});
});


//定制404页面
app.use(function(req, res){
	res.status(404);
	res.render('404')
});

//定制500页面
//如果不调用next(),请求就在那个中间件中终止了,如果 你不调用 next(),
//则应该发送一个响应到客户端(res.send、res.json、res.render 等),
//如果你不这样做,客户端会被挂起并最终导致超时。
app.use(function(err, erq, res, next){
	res.status(500);
	res.render('500')
});

app.listen(app.get('port'), function(){
	console.log('Express started on http://localhost:'+app.get('port')+';press Ctrl-C to terminate.');
});
