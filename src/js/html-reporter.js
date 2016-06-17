/*jshint node:true*/
'use strict';
var fs = require('fs');
var path = require('path');
var reporter = require('./reporter.js');

var hasOwnProperty = Object.prototype.hasOwnProperty;

const screenShotsDir = 'screenshots/';
const __featureDenominator = 'Feature: ';
const __scenarioDenominator = ' - Scenario: ';


function HTMLScreenshotReporter(options) {

	var self = this;
	self.tsStart = new Date();

	self.jasmineStarted = function (summary) {};

	self.suiteStarted = function (suite) {};

	self.specStarted = function (spec) {
		var featureName = spec.fullName.replace(spec.description, '');
		spec.description = __featureDenominator + featureName + __scenarioDenominator + spec.description + '|' + browser.browserName + '-' + browser.version;
	};

	self.specDone = function (spec) {
		browser.takeScreenshot().then(function (png) {
			writeScreenShot(png, 'target/' + screenShotsDir + sanitizeFilename(spec.description) + '.png');
		});
	};

	self.suiteDone = function (suite) {};

	self.jasmineDone = function () {};

	self.generateHtmlReport = function (inputFile) {
		var jsonResult = require((path.join(__dirname, '../../' + inputFile)));
		var result = generateReport(jsonResult, options.title, options.savePath, elapsedTime(self.tsStart, Date.now()));
		filewrite(result, options.htmlReportDestPath);
	};

	var writeScreenShot = function (data, filePath) {
		var stream = fs.createWriteStream(filePath);
		stream.write(new Buffer(data, 'base64'));
		stream.end();
	};

	var sanitizeFilename = function (name) {
		name = name.replace(/\s+/g, '-'); // Replace white space with dash
		return name.replace(/[^0-9a-zA-Z\-]/gi, ''); // Strip any special characters except the dash
	};

	function filewrite (result, outputFile) {
		fs.writeFileSync(outputFile, result);
	};

	function generateReport(jsonstr, automationHeader, savePath, elapsedTime) {
		var allResults = new Array();
		var testArray = new Array();
		var browserArrayUnique = reporter.getUniqueBrowserNames(jsonstr);

		for (var q = 0; q < jsonstr.length; q++) {
			var browserName = reporter.getBrowserNameFromResult(jsonstr[q]);
			var testName = reporter.getTestNameFromResult(jsonstr[q]);
			var passed = reporter.determineTestStatus(jsonstr[q]);
			var stack = [];
			//if(passed == false){
				stack = consolidateAllStackTraces(jsonstr[q]);
			//}
			allResults.push(passed);
			testArray.push({
				testName : testName,
				browser : browserName,
				res : passed,
				duration: jsonstr[q].duration,
				stackTrace:  stack
			});
		}

		var result = '';
		result += '<!-- saved from url=(0014)about:internet -->';
		result += '<!DOCTYPE html>';
		result += '<html>';
		result += concatHeadSection();
		result += '<body>';
		result += concatReportHeaderSection(automationHeader);
		result += concatRunInfoSection(elapsedTime);
		result += concatReportSummary(allResults);
		result += concatSpecResults(testArray, browserArrayUnique);
		result += '</body>';
		result += '</html>';
		return result;
	}

	function consolidateAllStackTraces (run){
		//console.log('run.assertions.length'+run.assertions.length);
		var assertions = run.assertions;
		var assertionsArray = new Array();
		var stk = [];
		for (var i = 0; i < assertions.length; i++) {
			//console.log('assertions['+i+'].passed:'+assertions[i].passed);
			if(assertions[i].passed == false){

				//console.log('falso saporra');
				if(assertions[i].errorMsg){

					//console.log('ah egua');
					stk.push(assertions[i].errorMsg);
				}
				if(assertions[i].stackTrace){

					//console.log('ah nego');
					var stckTrc = assertions[i].stackTrace.split('\n');
					for(var j=0; j<stckTrc.length; j++){
						stk.push(stckTrc[j]);
					}
				}
			}
		}
		//console.log(stk.length);
		return stk;
	}

	function concatSpecResults(testArray, browsers){

		var features = copyResultsToFeatureCollection(testArray);
		var countIndex = 0;
		var result = '';
		browsers.sort();

		for(var f in features){
			result += '<table class="testlist">';

			result += concatSpecTableHeader(f, browsers);

			for(var scen in features[f]){

				if (features[f].hasOwnProperty(scen)) {
					countIndex++;
				}

				result += '<tr><td>' + countIndex + '</td><td class="testname">' + scen + '</td>';

				var exceptions = [];
				for (var run in features[f][scen]) {
					for (var b in browsers) {
						var browserName = browsers[b];

						if (browserName === features[f][scen][run].name) {
							if (features[f][scen][run].status == "true") {
								result += '<td class="pass">' + linkToScreenshot(scen, browserName) + 'PASS</a></td>';
							}
							if (features[f][scen][run].status == "false") {
								result += '<td class="fail">FAIL ' + linkToScreenshot(scen, browserName) + 'screen shot</a> <a href="#" onclick="showhide(\''+runId(scen, browserName)+'\')">stack trace</a></td>';
								exceptions.push(concatStackTrace(runId(scen, browserName), features[f][scen][run], browsers.length + 2));
							}
							if (features[f][scen][run].status == "Skipped") {
								result += '<td class="skip">Skipped (test duration '+features[f][scen][run].duration+'ms)</td>';
							}
						}
					}
				}
				result += '</tr>';
				//console.log(exceptions);
				if(exceptions.length > 0){
					for(var i=0; i<exceptions.length; i++){
						result += exceptions[i];
					}
				}

			}

			result += '</tr></table>';
		}
		return result;
	}

	function concatStackTrace(id, run, colspan){
		//console.log(JSON.stringify(run));
		var result = '';
		if(run.stackTrace) {
			if (run.stackTrace.length > 0) {
				result += '<tr class="stack" style="display:none" id="' + id + '">' +
					'<td colspan="' + colspan + '" style="background-color: #FFBBBB">' +
					'<table class="stacker">' +
					'<tr><td class="error">' + reporter.encodeEntities(run.stackTrace[0]) + '</td></tr>';
				for (var i = 1; i < run.stackTrace.length; i++) {
					result += '<tr><td>' + reporter.encodeEntities(run.stackTrace[i]) + '</td></tr>'
				}
				result += '</table></td></tr>';
			}

		}	return result;
	}

	function concatSpecTableHeader(featureName, sortedBrowsers){
		var result = '<tr><th>Test#</th><th>' + featureName + '</th>';
		for (var i = 0; i < sortedBrowsers.length; i++) {
			result += '<th>' + sortedBrowsers[i] + '</th>';
		}
		result += '</tr>'
		return result;
	}

	function linkToScreenshot(scenarioName, browserName){
		return '<a href="' + screenShotsDir + runId(scenarioName, browserName) + '.png">';
	}

	function runId(scenarioName, browserName){
		return sanitizeFilename(scenarioName) + sanitizeFilename(browserName);
	}

	function copyResultsToFeatureCollection(resultArray){
		var featuresDummy = {};
		for (var i = 0; i < resultArray.length; i++) {
			var offset = __featureDenominator.length;
			var featureName = resultArray[i].testName.substr(offset, resultArray[i].testName.indexOf(__scenarioDenominator)-offset);
			if (!featuresDummy[featureName]) {
				featuresDummy[featureName] = {};
			}

			if (!featuresDummy[featureName][resultArray[i].testName]) {
				featuresDummy[featureName][resultArray[i].testName] = {};
			}

			if (!featuresDummy[featureName][resultArray[i].testName][resultArray[i].browser]) {
				featuresDummy[featureName][resultArray[i].testName][resultArray[i].browser] = {};
			}

			featuresDummy[featureName][resultArray[i].testName][resultArray[i].browser] = {
				name: resultArray[i].browser,
				duration : resultArray[i].duration,
				status : resultArray[i].res,
				stackTrace : resultArray[i].stackTrace
			};
		}
		return featuresDummy;
	}

	function concatHeadSection(){
		var result = '<head><meta http-equiv="Content-Type" content="text/html" />';
		result += concatCssSection();
		result += concatScriptSection();
		result += '</head>';
		return result;
	}

	function concatScriptSection(){
		var result = '<script type="text/javascript">';
		result += '	function showhide(id) {';
		result += '		var e = document.getElementById(id);';
		result += '		e.style.display = (e.style.display == "none") ? "table-row" : "none";';
		result += '	}';
		result += '	</script>';
		return result;
	}

	function concatCssSection(){
		var result ='<style type="text/css">';
		result += 'body{';
		result +='	font-family: verdana, arial, sans-serif;';
		result +='}';
		result +='table {';
		result +='	border-collapse: collapse;';
		result +='	display: table;';
		result +='}';
		result +='.header {';
		result +='	font-size: 21px;';
		result +='	margin-top: 21px;';
		result +='	text-decoration: underline;';
		result +='	margin-bottom:21px;';
		result +='}';
		result +='table.runInfo tr {';
		result +='	border-bottom-width: 1px;';
		result +='	border-bottom-style: solid;';
		result +='	border-bottom-color: #d0d0d0;';
		result +='	font-size: 10px;';
		result +='	color: #999999;';
		result +='}';
		result +='table.runInfo td:first-child {';
		result +='	padding-right: 25px;';
		result +='}';
		result +='table.summary {';
		result +='	font-size: 9px;';
		result +='	color: #333333;';
		result +='	border-width: 1px;';
		result +='	border-color: #999999;';
		result +='	margin-top: 21px;';
		result +='}';
		result +='table.summary tr {';
		result +='	background-color: #EFEFEF';
		result +='}';
		result +='table.summary th {';
		result +='	background-color: #DEDEDE;';
		result +='	border-width: 1px;';
		result +='	padding: 6px;';
		result +='	border-style: solid;';
		result +='	border-color: #B3B3B3;';
		result +='}';
		result +='table.summary td {';
		result +='	border-width: 1px;';
		result +='	padding: 6px;';
		result +='	border-style: solid;';
		result +='	border-color: #CFCFCF;';
		result +='	text-align: center';
		result +='}';
		result +='table.testlist {';
		result +='	font-size: 10px;';
		result +='	color: #666666;';
		result +='	border-width: 1px;';
		result +='	border-color: #999999;';
		result +='	margin-top: 21px;';
		result +='	width: 100%;';
		result +='}';
		result +='table.testlist th {';
		result +='	background-color: #CDCDCD;';
		result +='	border-width: 1px;';
		result +='	padding: 6px;';
		result +='	border-style: solid;';
		result +='	border-color: #B3B3B3;';
		result +='}';
		result +='table.testlist tr {';
		result +='	background-color: #EFEFEF';
		result +='}';
		result +='table.testlist td {';
		result +='	border-width: 1px;';
		result +='	padding: 6px;';
		result +='	border-style: solid;';
		result +='	border-color: #CFCFCF;';
		result +='	text-align: center';
		result +='}';
		result +='table.testlist td.pass {';
		result +='	background-color: #BBFFBB;';
		result +='}';
		result +='table.testlist td.clean a {';
		result +='	text-decoration: none;';
		result +='}';
		result +='table.testlist td.fail {';
		result +='	background-color: #FFBBBB;';
		result +='}';
		result +='table.testlist td.skip {';
		result +='	color: #787878;';
		result +='}';
		result +='table.testlist td.testname {';
		result +='	text-align: left;';
		result +='}';
		result +='table.testlist td.totals {';
		result +='	background-color: #CDCDCD;';
		result +='	border-color: #B3B3B3;';
		result +='	color: #666666;';
		result +='	padding: 2px;';
		result +='}';
		result +='tr.stack {';
		result +='	display : none';
		result +='}';
		result +='table.stacker {';
		result +='	font-size: 10px;';
		result +='	width: 100%;';
		result +='	border-style: solid;';
		result +='	border-width: 1px;';
		result +='	border-color: #CFCFCF;';
		result +='}';
		result +='table.stacker td {';
		result +='	text-align: left;';
		result +='	padding: 3px;';
		result +='	padding-left:43px;';
		result +='	color: #666666;';
		result +='	border-style: none;';
		result +='}';
		result +='table.stacker td.error {';
		result +='	text-align: left;';
		result +='	color: #FF0000;';
		result +='	padding: 3px;';
		result +='	padding-left:13px;';
		result +='	border-style: none;';
		result +='}';
		result +='table.stacker tr:nth-child(odd) {';
		result +='	background-color: #F8F8F8;';
		result +='}';
		result += '</style>';
		return result;
	}

	function concatReportHeaderSection(automationHeader){
		return '<div class="header">' + automationHeader + '</div>';
	}

	function concatRunInfoSection(elapsedTime){
		return '<table class="runInfo"><tr><td>Elapsed time</td><td>' + elapsedTime + '</td></tr></table>';
	}

	function concatReportSummary(allResults){
		var pass = reporter.countPassed(allResults);
		var fail = reporter.countFailed(allResults);
		var skipped = reporter.countSkipped(allResults);
		var result = '';
		var total = pass + fail + skipped;
		if(skipped > 0){
			result += '<table class="summary"><tr><th>Total</th><th>Executed</th><th>Pending</th><th>Pass</th><th>Fail</th><th>Pass%</th></tr><tr><td>';
		}else {
			result += '<table class="summary"><tr><th>Total</th><th>Pass</th><th>Fail</th><th>Pass%</th></tr><tr><td>';
		}
		result += total + '</td><td>';
		if(skipped > 0){
			result += (pass+fail) + '</td><td>';
			result += (skipped) + '</td><td>';
		}
		result += pass + '</td><td>';
		result += fail + '</td><td>';
		result += calculatePassPercentage(pass, fail) + '</td></tr></table>';
		return result;
	}

	function calculatePassPercentage(pass, fail){
		return Math.floor((pass / (pass+fail)) * 100);
	}

	function elapsedTime(tsStart, tsEnd){
		var timeDiff = tsEnd - tsStart;
		timeDiff /= 1000;
		var seconds = Math.round(timeDiff % 60);
		timeDiff = Math.floor(timeDiff / 60);
		var minutes = Math.round(timeDiff % 60);
		timeDiff = Math.floor(timeDiff / 60);
		var hours = Math.round(timeDiff % 24);
		timeDiff = Math.floor(timeDiff / 24);
		var days = timeDiff ;
		var str = '';
		str += (days>0) ? days + ' days ' : '';
		str += (days>0 || hours>0) ? hours + ' hs. ' : '';
		str += (days>0 || hours>0 || minutes>0) ? minutes + ' mins. ' : '';
		str += seconds + ' secs.';
		return str;
	}

	return this;
}

module.exports = HTMLScreenshotReporter;







