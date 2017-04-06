

//Define variables
var country_code = 'All';
var admlevel = 2;				// NOTE: For now, I keep the admlevels in the code as 2-4 instead of 0-2 which is the actual data. The principal works the same, and it keeps me from having to adjust everything now..
var metric = 'population';
var metric_label = '';
var metric_year = '';
var metric_source = '';
var metric_desc = '';
var metric_icon = '';
var admlevel_text = '';
var name_selection = '';
var name_selection_prev = '';
var name_popup = '';
var value_popup = 0;
var country_selection = '';
var level2_selection = undefined;
var level3_selection = undefined;
var level2_code = '';
var level3_code = '';
var type_selection = '';
var subtype_selection = ''; 
window.parent_code = '';
var data_input = '';
window.filters = [];
var tables = [];
var x = 500;
var y = 200;
var mapfilters_length = 0;
var d_prev = '';
var map;
var config =  {
	whereFieldName:'pcode',
	joinAttribute:'pcode',
	nameAttribute:'name',
	color:'#0080ff'
};	

var load_dashboard = function() {
	  
	//Load data
	var d = {};
	d3.dsv(';')("data/metadata_prototype.csv", function(metadata){
		var meta = metadata;
		d.Metadata = $.grep(meta, function(e){ return e.country_code == 'All' || e.country_code == country_code; });
		d3.dsv(';')("data/country_metadata.csv", function(metadata_country){
			d.Country_meta = metadata_country;
			d3.dsv(';')("data/ind_level" + (admlevel - 2) + ".csv", function(ind_data){
				ind_data.forEach(function(d){ d['population'] = +d['population'];d['land_area'] = +d['land_area'];d['pop_density'] = +d['pop_density']; });  
				d.Rapportage = ind_data;
				d3.json("data/geo_level" + (admlevel - 2) + ".json", function (geo_data) {
					d.Districts = geo_data;
					console.log(d);
				  
				  // generate the actual content of the dashboard
				  generateCharts(d);
				  
				  //Check if browser is IE (L_PREFER_CANVAS is a result from an earlier IE-check in layout.server.view.html)	
				  if (typeof L_PREFER_CANVAS !== 'undefined') {
					$('#IEmodal').modal('show');
				  }
				});
			});
		});
	});	

};

var reload_dashboard = function(d) {
	  
	//Load data  
	d3.dsv(';')("data/ind_level" +  (admlevel - 2)  + ".csv", function(ind_data){
		ind_data.forEach(function(d){ d['population'] = +d['population'];d['land_area'] = +d['land_area'];d['pop_density'] = +d['pop_density']; });  
		var Rapportage_temp = ind_data;
		if (admlevel == 2) {
			d.Rapportage = Rapportage_temp;
		} else {
			d.Rapportage = $.grep(Rapportage_temp, function(e){ return e.pcode_parent == parent_code; }); //parent_code_arr.indexOf(e.pcode_parent) > -1;}); //
		};
		d3.json("data/geo_level" +  (admlevel - 2)  + ".json", function (geo_data) {
			//d.Districts = geo_data;
			var Districts_temp = geo_data;
			if (admlevel == 2) {
				d.Districts.features = Districts_temp.features;
			} else {
				d.Districts.features = $.grep(Districts_temp.features, function(e){ return e.properties.pcode_parent == parent_code; }); //parent_code_arr.indexOf(e.properties.pcode_parent) > -1;}); 
			};
			console.log(d);
		  
		  // generate the actual content of the dashboard
		  generateCharts(d);
		  
		  //Check if browser is IE (L_PREFER_CANVAS is a result from an earlier IE-check in layout.server.view.html)	
		  if (typeof L_PREFER_CANVAS !== 'undefined') {
			$('#IEmodal').modal('show');
		  }
		});
	});

};

load_dashboard();



///////////////////////////////////////////
// MAIN FUNCTION TO GENERATE ALL CONTENT //
///////////////////////////////////////////

var generateCharts = function (d){
	
	//////////////////////
	// SET UP FUNCTIONS //
	//////////////////////

	// fill the lookup table which finds the community name with the community code
	var genLookup = function (field){
		var lookup = {};
		d.Districts.features.forEach(function(e){
			lookup[e.properties[config.joinAttribute]] = String(e.properties[field]);
		});
		return lookup;
	};
	// fill the lookup table with the metadata-information per variable
	var genLookup_meta = function (d,field){
		var lookup_meta = {};
		d.Metadata.forEach(function(e){
			lookup_meta[e.variable] = String(e[field]);
		});
		return lookup_meta;
	};
	// fill the lookup table with the metadata-information per variable
	var genLookup_country_meta = function (d,field){
		var lookup_country_meta = {};
		d.Country_meta.forEach(function(e){
			lookup_country_meta[e.country_code] = String(e[field]);
		});
		return lookup_country_meta;
	};

	// function to find object property value by path 
	var deepFind = function deepFind(obj, path) {
		  var paths = path.split('.'),
			  current = obj,
			  i;

		  for (i = 0; i < paths.length; ++i) {
			if (current[paths[i]] === undefined) {
			  return undefined;
			} else {
			  current = current[paths[i]];
			}
		  }
		  return current;
	};
	
	// Clear the charts
	dc.chartRegistry.clear();
	if (map !== undefined) { map.remove(); }
	
	//define dc-charts (the name-tag following the # is how you refer to these charts in html with id-tag)
	var mapChart = dc.leafletChoroplethChart('#map-chart');
	//var rowChart = dc.rowChart('#tab-chart');
	
	//////////////////////////
	// SETUP META VARIABLES //
	//////////////////////////

	//set up country metadata
	var country_name = genLookup_country_meta(d,'country_name');
	var country_level2 = genLookup_country_meta(d,'level2_name');
	var country_level3 = genLookup_country_meta(d,'level3_name');
	var country_level4 = genLookup_country_meta(d,'level4_name');
	var country_zoom_min = genLookup_country_meta(d,'zoomlevel_min');
	var country_zoom_max = genLookup_country_meta(d,'zoomlevel_max');
	var country_default_metric = genLookup_country_meta(d,'default_metric');

	var country_selection = country_name[country_code];
	for (var i=0;i<$('.country_selection').length;i++){ $('.country_selection')[i].innerHTML = country_selection; };
	var zoom_min = country_zoom_min[country_code]; 
	var zoom_max = country_zoom_max[country_code]; 
	if (metric === '') { 
		metric = country_default_metric[country_code]; 
	}
	if (admlevel == zoom_min) { 
		name_selection = country_name[country_code]; 
		for (var i=0;i<$('.name_selection').length;i++){ $('.name_selection')[i].innerHTML = name_selection; };
	}
	if (zoom_max < 4) {document.getElementById('level4').style.visibility = 'hidden'; }			
				
	// get the lookup tables
	var lookup = genLookup(config.nameAttribute);
	
	var meta_label = genLookup_meta(d,'label');
	var meta_format = genLookup_meta(d,'format');
	var meta_unit = genLookup_meta(d,'unit');
	var meta_icon = genLookup_meta(d,'icon_src');
	var meta_year = genLookup_meta(d,'year');
	var meta_source = genLookup_meta(d,'source_link');
	var meta_desc = genLookup_meta(d,'description');
	var meta_scorevar = genLookup_meta(d,'scorevar_name');
	
	var metric_label = meta_label[metric];
	for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
	
	if (admlevel === 2) {
		type_selection = 'Country';
		subtype_selection = country_level2[country_code]; 
		for (var i=0;i<$('.subtype_selection').length;i++){ $('.subtype_selection')[i].innerHTML = subtype_selection; };
		level2_selection = undefined;
		for (var i=0;i<$('.level2_selection').length;i++){ $('.level2_selection')[i].innerHTML = level2_selection; };
		level3_selection = undefined;
		for (var i=0;i<$('.level3_selection').length;i++){ $('.level3_selection')[i].innerHTML = level3_selection; };
		level2_code = '';
		level3_code = '';
	} else if (admlevel === 3) {
		type_selection = country_level2[country_code]; 
		subtype_selection = country_level3[country_code]; 
		for (var i=0;i<$('.subtype_selection').length;i++){ $('.subtype_selection')[i].innerHTML = subtype_selection; };
		level2_selection = name_selection;
		for (var i=0;i<$('.level2_selection').length;i++){ $('.level2_selection')[i].innerHTML = level2_selection; };
		level2_code = parent_code;
		level3_selection = undefined;
		for (var i=0;i<$('.level3_selection').length;i++){ $('.level3_selection')[i].innerHTML = level3_selection; };
		level3_code = '';
	} else if (admlevel === 4) {
		type_selection = country_level3[country_code]; 
		subtype_selection = country_level4[country_code]; 
		for (var i=0;i<$('.subtype_selection').length;i++){ $('.subtype_selection')[i].innerHTML = subtype_selection; };
		level3_selection = name_selection;
		for (var i=0;i<$('.level3_selection').length;i++){ $('.level3_selection')[i].innerHTML = level3_selection; };
		level3_code = parent_code;
	}
	
	var tables = [];
	for (var i=0; i < d.Metadata.length; i++) {
		var record = {};
		var record_temp = d.Metadata[i];
		record.id = 'data-table' + [i+1];
		record.name = record_temp.variable;
		record.group = record_temp.group;
		record.propertyPath = record_temp.agg_method === 'sum' ? 'value' : 'value.finalVal';
		record.dimension = undefined;
		record.weight_var = record_temp.weight_var;
		record.scorevar_name = record_temp.scorevar_name;
		tables[i] = record;
	}
	
				
	/////////////////////
	// NUMBER FORMATS ///
	/////////////////////
	
	//Define number formats for absolute numbers and for percentage metrics
	var intFormat = d3.format(',');
	var dec0Format = d3.format(',.0f');
	var dec1Format = d3.format(',.1f');
	var dec2Format = d3.format('.2f');
	var percFormat = d3.format(',.2%');
	
	var currentFormat = function(value) {
		if (meta_format[metric] === 'decimal0') { return dec0Format(value);}
		else if (meta_format[metric] === 'decimal2') { return dec2Format(value);}
		else if (meta_format[metric] === 'percentage') { return percFormat(value);}
	};
	
	
	///////////////////////
	// CROSSFILTER SETUP //
	///////////////////////
	
	//var cf = crossfilter(d3.range(0, data.Districts.features.length));
	var cf = crossfilter(d.Rapportage);
	
	// The wheredimension returns the unique identifier of the geo area
	var whereDimension = cf.dimension(function(d) { return d.pcode; });
	//var whereDimension_tab = cf.dimension(function(d) { return d.pcode; });
	
	// Create the groups for these two dimensions (i.e. sum the metric)
	var whereGroupSum = whereDimension.group().reduceSum(function(d) { return d[metric];});
	//var whereGroupSum_tab = whereDimension_tab.group();
	var whereGroupSum_scores = whereDimension.group().reduceSum(function(d) { if (!meta_scorevar[metric]) { return d[metric];} else { return d[meta_scorevar[metric]];};});

	// group with all, needed for data-count
	var all = cf.groupAll();
	// get the count of the number of rows in the dataset (total and filtered)
	dc.dataCount('#count-info')
			.dimension(cf)
			.group(all);
		
	// Create customized reduce-functions to be able to calculated percentages over all or multiple districts (i.e. the % of male volunteers))
	var reduceAddAvg = function(metricA,metricB) {
		return function(p,v) {
			p.sumOfSub += v[metricA]*v[metricB];
			p.sumOfTotal += v[metricB];
			p.finalVal = p.sumOfSub / p.sumOfTotal;
			return p;
		};
	};
	var reduceRemoveAvg = function(metricA,metricB) {
		return function(p,v) {
			p.sumOfSub -= v[metricA]*v[metricB];
			p.sumOfTotal -= v[metricB];
			p.finalVal = p.sumOfSub / p.sumOfTotal;
			return p;
		};
	};
	var reduceInitialAvg = function() {
		return {sumOfSub:0, sumOfTotal:0, finalVal:0 };
	}; 
	

	//All data-tables are not split up in dimensions. The metric is always the sum of all selected records. Therefore we create one total-dimension
	var totaalDim = cf.dimension(function(i) { return 'Total'; });
	
	//Create the appropriate crossfilter dimension-group for each element of Tables
	var dimensions = [];
	tables.forEach(function(t) {
		var name = t.name;
		if (t.propertyPath === 'value.finalVal') {
			var weight_var = t.weight_var;
			dimensions[name] = totaalDim.group().reduce(reduceAddAvg([name],[weight_var]),reduceRemoveAvg([name],[weight_var]),reduceInitialAvg);
		} else if (t.propertyPath === 'value') {
			dimensions[name] = totaalDim.group().reduceSum(function(d) {return d[name];});
		}
	});
	// Make a separate one for the filling of the bar charts (based on 0-10 score per indicator)
	var dimensions_scores = [];
	tables.forEach(function(t) {
		var name = t.name;
		if (t.scorevar_name) { 
			var name_score = t.scorevar_name;
			if (t.propertyPath === 'value.finalVal') {
				var weight_var = t.weight_var;
				dimensions_scores[name] = totaalDim.group().reduce(reduceAddAvg([name_score],[weight_var]),reduceRemoveAvg([name_score],[weight_var]),reduceInitialAvg);
			} else if (t.propertyPath === 'value') {
				dimensions_scores[name] = totaalDim.group().reduceSum(function(d) {return d[name_score];});
			}
		}
	});
	//Now attach the dimension to the tables-array		
	var i;
	for (i=0; i < d.Metadata.length; i++) {
		var name = tables[i].name;
		tables[i].dimension = dimensions[name];
	}
	
	
	///////////////////////////////
	// SET UP ALL INDICATOR HTML //
	///////////////////////////////
	
	//Create table with current crossfilter-selection output, so that you can also access this in other ways than through DC.js
	var fill_keyvalues = function() {
		var keyvalue = [];
		tables.forEach(function(t) {
			var key = t.name;
			if (admlevel == zoom_max && filters.length == 0) {
				if(meta_format[t.name] === 'decimal0'){
					keyvalue[key] =  dec0Format(d_prev[t.name]);
				} else if(meta_format[t.name] === 'percentage'){
					keyvalue[key] =  percFormat(d_prev[t.name]);
				} else if(meta_format[t.name] === 'decimal2'){
					keyvalue[key] =  dec2Format(d_prev[t.name]);
				}
			} else {
				if (t.propertyPath === 'value.finalVal') {
					if (isNaN(dimensions[t.name].top(1)[0].value.finalVal)) {
						keyvalue[key] =  'N.A. on this level'; 
					} else if(meta_format[t.name] === 'decimal0'){
						keyvalue[key] = dec0Format(dimensions[t.name].top(1)[0].value.finalVal);
					} else if(meta_format[t.name] === 'percentage'){
						keyvalue[key] = percFormat(dimensions[t.name].top(1)[0].value.finalVal);
					} else if(meta_format[t.name] === 'decimal2'){
						keyvalue[key] = dec2Format(dimensions[t.name].top(1)[0].value.finalVal);
					}
				} else if(t.propertyPath === 'value') {
					if (isNaN(dimensions[t.name].top(1)[0].value)) {
						keyvalue[key] =  'N.A. on this level'; 
					} else if(meta_format[t.name] === 'decimal0'){
						keyvalue[key] = dec0Format(dimensions[t.name].top(1)[0].value);
					} else if(meta_format[t.name] === 'percentage'){
						keyvalue[key] = percFormat(dimensions[t.name].top(1)[0].value);
					} else if(meta_format[t.name] === 'decimal2'){
						keyvalue[key] = dec2Format(dimensions[t.name].top(1)[0].value);
					}
				}
			}
		});
		return keyvalue;
	};
	var keyvalue = fill_keyvalues();
	
	var high_med_low = function(ind,ind_score) {
		
		if (dimensions_scores[ind]) {
			if (admlevel == zoom_max && filters.length == 0) {
					var width = d_prev[ind_score];
				} else {
					var width = dimensions_scores[ind].top(1)[0].value.finalVal;
				}
			if (isNaN(width)) {return 'notavailable';}
			else if (width < 3.5) { return 'good';} 
			else if (width <= 4.5) {return 'medium-good';}
			else if (width <= 5.5) {return 'medium';}
			else if (width <= 6.5) {return 'medium-bad';}
			else if (width > 6.5) { return 'bad';} 
		}				
	};	

	var createHTML = function(keyvalue) {
		
		var risk_score = document.getElementById('risk_score_main');
		if (risk_score) {
			risk_score.textContent = keyvalue.risk_score;
			risk_score.setAttribute('class','component-score ' + high_med_low('risk_score','risk_score'));					
		}
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		if (vulnerability_score) {
			vulnerability_score.textContent = keyvalue.vulnerability_score;
			vulnerability_score.setAttribute('class','component-score ' + high_med_low('vulnerability_score','vulnerability_score'));				
		}
		var hazard_score = document.getElementById('hazard_score_main');
		if (hazard_score) {
			hazard_score.textContent = keyvalue.hazard_score;
			hazard_score.setAttribute('class','component-score ' + high_med_low('hazard_score','hazard_score'));				
		}
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (coping_score) {
			coping_score.textContent = keyvalue.coping_capacity_score;
			coping_score.setAttribute('class','component-score ' + high_med_low('coping_capacity_score','coping_capacity_score'));				
		}

		
		//Dynamically create HTML-elements for all indicator tables
		var general = document.getElementById('general');
		var scores = document.getElementById('scores');
		var vulnerability = document.getElementById('vulnerability');
		var hazard = document.getElementById('hazard');
		var coping = document.getElementById('coping');
		var other = document.getElementById('other');
		while (general.firstChild) { general.removeChild(general.firstChild); }
		while (scores.firstChild) { scores.removeChild(scores.firstChild); }
		while (vulnerability.firstChild) { vulnerability.removeChild(vulnerability.firstChild); }
		while (hazard.firstChild) { hazard.removeChild(hazard.firstChild); }
		while (coping.firstChild) { coping.removeChild(coping.firstChild); }
		while (other.firstChild) { other.removeChild(other.firstChild); }
		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (!meta_icon[record.name]) {var icon = 'img/undefined.png';}
			else {var icon = 'img/'+meta_icon[record.name];}
			
			if (record.group === 'general') {
				
				if (meta_unit[record.name] === 'null') {var unit = '';} else {var unit = meta_unit[record.name];}
				
				var div = document.createElement('div');
				div.setAttribute('class','row profile-item');
				var parent = document.getElementById(record.group);
				parent.appendChild(div);
				var div0 = document.createElement('div');
				div0.setAttribute('class','col col-md-1');
				div.appendChild(div0);	
				var img = document.createElement('img');
				img.setAttribute('class','community-icon');
				img.setAttribute('src',icon);
				div0.appendChild(img);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col col-md-5 general-component-label');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				div.appendChild(div1);	
				//$compile(div1)($scope);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col col-md-4');
				div2.setAttribute('id',record.name);
				div2.innerHTML = keyvalue[record.name] + ' ' + unit;
				div.appendChild(div2);
				var div3 = document.createElement('div');
				div3.setAttribute('class','col col-md-2');
				div.appendChild(div3);
				var button = document.createElement('button');
				button.setAttribute('type','button');
				button.setAttribute('class','btn-modal');
				button.setAttribute('data-toggle','modal');
				button.setAttribute('onclick','info(\'' + record.name + '\')');
				div3.appendChild(button);
				//$compile(button)($scope);
				var img = document.createElement('img');
				img.setAttribute('src','img/icon-popup.svg');
				img.setAttribute('style','height:17px');
				button.appendChild(img);
			
			} else if (record.group === 'other') {
				
				if (admlevel == zoom_max && filters.length == 0) {
					var width = d_prev[record.scorevar_name]*10;
				} else {
					var width = dimensions[record.name].top(1)[0].value.finalVal*10;
				}

				var div = document.createElement('div');
				div.setAttribute('class','component-section');
				var parent = document.getElementById(record.group);
				parent.appendChild(div);
				var div0 = document.createElement('div');
				div0.setAttribute('class','col-md-2');
				div.appendChild(div0);	
				var img1 = document.createElement('img');
				img1.setAttribute('style','height:20px');
				img1.setAttribute('src',icon);
				div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-3 component-label');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				//$compile(div1)($scope);
				div.appendChild(div1);	
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score ' + high_med_low(record.name,record.scorevar_name));
				div1a.setAttribute('id',record.name);
				div1a.innerHTML = keyvalue[record.name];
				div1.appendChild(div1a);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5');
				div.appendChild(div2);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar ' + high_med_low(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:'+ width + '%');
				div2a.appendChild(div2a1);
				var img2 = document.createElement('img');
				img2.setAttribute('class','scale-icon');
				img2.setAttribute('src','modules/dashboards/img/icon-scale.svg');
				div2a.appendChild(img2);
				var div3 = document.createElement('div');
				div3.setAttribute('class','col-sm-2 col-md-2 no-padding');
				div.appendChild(div3);
				var button = document.createElement('button');
				button.setAttribute('type','button');
				button.setAttribute('class','btn-modal');
				button.setAttribute('data-toggle','modal');
				button.setAttribute('onclick','info(\'' + record.name + '\')');
				div3.appendChild(button);
				//$compile(button)($scope);
				var img3 = document.createElement('img');
				img3.setAttribute('src','img/icon-popup.svg');
				img3.setAttribute('style','height:17px');
				button.appendChild(img3);
			}
			
			else if (record.group) {
				
				if (admlevel == zoom_max && filters.length == 0) {
					var width = d_prev[record.scorevar_name]*10;
				} else {
					var width = dimensions_scores[record.name].top(1)[0].value.finalVal*10;
				}

				var div = document.createElement('div');
				div.setAttribute('class','component-section');
				var parent = document.getElementById(record.group);
				parent.appendChild(div);
				var div0 = document.createElement('div');
				div0.setAttribute('class','col-md-2');
				div.appendChild(div0);	
				var img1 = document.createElement('img');
				img1.setAttribute('style','height:20px');
				img1.setAttribute('src',icon);
				div0.appendChild(img1);
				var div1 = document.createElement('div');
				div1.setAttribute('class','col-md-3 component-label');
				div1.setAttribute('onclick','map_coloring(\''+record.name+'\')');
				div1.innerHTML = meta_label[record.name];
				//$compile(div1)($scope);
				div.appendChild(div1);	
				var div1a = document.createElement('div');
				div1a.setAttribute('class','component-score ' + high_med_low(record.name,record.scorevar_name));
				div1a.setAttribute('id',record.name);
				div1a.innerHTML = keyvalue[record.name];
				div1.appendChild(div1a);
				var div2 = document.createElement('div');
				div2.setAttribute('class','col-md-5');
				div.appendChild(div2);
				var div2a = document.createElement('div');
				div2a.setAttribute('class','component-scale');
				div2.appendChild(div2a);
				var div2a1 = document.createElement('div');
				div2a1.setAttribute('class','score-bar ' + high_med_low(record.name,record.scorevar_name));
				div2a1.setAttribute('id','bar-'+record.name);
				div2a1.setAttribute('style','width:'+ width + '%');
				div2a.appendChild(div2a1);
				var img2 = document.createElement('img');
				img2.setAttribute('class','scale-icon');
				img2.setAttribute('src','img/icon-scale.svg');
				div2a.appendChild(img2);
				var div3 = document.createElement('div');
				div3.setAttribute('class','col-sm-2 col-md-2 no-padding');
				div.appendChild(div3);
				var button = document.createElement('button');
				button.setAttribute('type','button');
				button.setAttribute('class','btn-modal');
				button.setAttribute('data-toggle','modal');
				button.setAttribute('onclick','info(\'' + record.name + '\')');
				div3.appendChild(button);
				//$compile(button)($scope);
				var img3 = document.createElement('img');
				img3.setAttribute('src','img/icon-popup.svg');
				img3.setAttribute('style','height:17px');
				button.appendChild(img3);
			}
		}
	};
	createHTML(keyvalue);
	
	
	var updateHTML = function(keyvalue) {
		
		var risk_score = document.getElementById('risk_score_main');
		if (risk_score) {
			risk_score.textContent = keyvalue.risk_score;
			risk_score.setAttribute('class','component-score ' + high_med_low('risk_score','risk_score'));					
		}
		var vulnerability_score = document.getElementById('vulnerability_score_main');
		if (vulnerability_score) {
			vulnerability_score.textContent = keyvalue.vulnerability_score;
			vulnerability_score.setAttribute('class','component-score ' + high_med_low('vulnerability_score','vulnerability_score'));				
		}
		var hazard_score = document.getElementById('hazard_score_main');
		if (hazard_score) {
			hazard_score.textContent = keyvalue.hazard_score;
			hazard_score.setAttribute('class','component-score ' + high_med_low('hazard_score','hazard_score'));				
		}
		var coping_score = document.getElementById('coping_capacity_score_main');
		if (coping_score) {
			coping_score.textContent = keyvalue.coping_capacity_score;
			coping_score.setAttribute('class','component-score ' + high_med_low('coping_capacity_score','coping_capacity_score'));				
		}

		for (var i=0;i<tables.length;i++) {
			var record = tables[i];
			
			if (record.group === 'general') {
				
				if (meta_unit[record.name] === 'null') {var unit = '';} else {var unit = meta_unit[record.name];}
				var div2 = document.getElementById(record.name);
				div2.innerHTML = keyvalue[record.name] + ' ' + unit;
			
			} else if (record.group === 'other') {
				
				if (admlevel == zoom_max && filters.length == 0) {
					var width = d_prev[record.scorevar_name]*10;
				} else {
					var width = dimensions[record.name].top(1)[0].value.finalVal*10;
				}
			
				var div1a = document.getElementById(record.name);
				div1a.setAttribute('class','component-score ' + high_med_low(record.name,record.scorevar_name));
				div1a.innerHTML = keyvalue[record.name];
				var div2a1 = document.getElementById('bar-'+record.name);
				div2a1.setAttribute('class','score-bar ' + high_med_low(record.name,record.scorevar_name));
				div2a1.setAttribute('style','width:'+ width + '%');
			}
			
			else if (record.group) {
				
				if (admlevel == zoom_max && filters.length == 0) {
					var width = d_prev[record.scorevar_name]*10;
				} else {
					var width = dimensions_scores[record.name].top(1)[0].value.finalVal*10;
				}
			
				var div1a = document.getElementById(record.name);
				div1a.setAttribute('class','component-score ' + high_med_low(record.name,record.scorevar_name));
				div1a.innerHTML = keyvalue[record.name];
				var div2a1 = document.getElementById('bar-'+record.name);
				div2a1.setAttribute('class','score-bar ' + high_med_low(record.name,record.scorevar_name));
				div2a1.setAttribute('style','width:'+ width + '%');
			}
		}
	};

	
	/////////////////////
	// MAP CHART SETUP //
	/////////////////////
	
	//color-quantile-range
	var quantile_range = [];
	for (i=0;i<d.Rapportage.length;i++) {
		quantile_range[i] = d.Rapportage[i][metric];
	};	
	
	//Set up the map itself with all its properties
	mapChart
		.width($('#map-chart').width())
		.height(800)
		.dimension(whereDimension)
		.group(whereGroupSum_scores)
		.center([0,0])
		.zoom(0)
		.geojson(d.Districts)					
		.colors(d3.scale.quantile()
				.domain(quantile_range)
				.range(['#f1eef6','#bdc9e1','#74a9cf','#2b8cbe','#045a8d']))
		.colorCalculator(function(d){
			return d ? mapChart.colors()(d) : '#cccccc';
		})
		.featureKeyAccessor(function(feature){
			return feature.properties.pcode;
		})
		.popup(function(d){
			return lookup[d.key].concat(' - ',meta_label[metric],': ',currentFormat(d.value));
		})
		.renderPopup(true)
		.turnOnControls(true)
		//Set up what happens when clicking on the map (popup appearing mainly)
		.on('filtered',function(chart,filters){
			window.filters = chart.filters();
			filters = window.filters;
			var popup = document.getElementById('mapPopup');
			popup.style.visibility = 'hidden';
			document.getElementById('zoomin_icon').style.visibility = 'hidden';
			if (filters.length > mapfilters_length) {
				//$apply(function() {
					name_popup = lookup[filters[filters.length - 1]];
					for (var i=0;i<$('.name_popup').length;i++){ $('.name_popup')[i].innerHTML = name_popup; };
					for (var i=0;i<d.Rapportage.length;i++) {
						var record = d.Rapportage[i];
						if (record.pcode === filters[filters.length - 1]) {
							value_popup = currentFormat(record[metric]); 
							for (var i=0;i<$('.value_popup').length;i++){ $('.value_popup')[i].innerHTML = value_popup; };								
							break;
						};
					}
					metric_label = meta_label[metric];
					for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
				//})
				//In Firefox event is not a global variable >> Not figured out how to fix this, so gave the popup a fixed position in FF only
				if (typeof event !== 'undefined') {
					popup.style.left = event.pageX + 'px';	
					popup.style.top = event.pageY + 'px';
				} else {
					popup.style.left = '400px';	
					popup.style.top = '100px';
				}
				popup.style.visibility = 'visible';
				if (admlevel < zoom_max) { document.getElementById('zoomin_icon').style.visibility = 'visible'; }
			} 
			mapfilters_length = filters.length;
			//Recalculate all community-profile figures
			var keyvalue = fill_keyvalues();
			updateHTML(keyvalue);	
			//let reset-button (dis)appear
			var resetbutton = document.getElementsByClassName('reset-button')[0];	
			if (filters.length > 0) {
				resetbutton.style.visibility = 'visible';
			} else {
				resetbutton.style.visibility = 'hidden';
			}
			
		})
	;
	
		
	///////////////////////////
	// MAP RELATED FUNCTIONS //
	///////////////////////////
	
	zoom_in = function() {
		
		if (filters.length > 0 && admlevel < zoom_max) {
			admlevel = admlevel + 1;
			parent_code_prev = parent_code;
			name_selection_prev = name_selection;
			window.parent_code = filters[filters.length - 1];
			parent_code_arr = filters;
			name_selection = lookup[parent_code];
			for (var i=0;i<$('.name_selection').length;i++){ $('.name_selection')[i].innerHTML = name_selection; };
			if (admlevel == zoom_max) {
				metric = 'population';
				for (var i=0;i<d.Rapportage.length;i++) {
					var record = d.Rapportage[i];
					if (record.pcode === filters[0]) {d_prev = record; break;}
				}
			}
			filters = [];
			reload_dashboard(d);
			document.getElementById('level' + admlevel).setAttribute('class','btn btn-secondary btn-active');
			document.getElementById('mapPopup').style.visibility = 'hidden';
			document.getElementById('zoomin_icon').style.visibility = 'hidden';
			document.getElementsByClassName('reset-button')[0].style.visibility = 'hidden';
			mapfilters_length = 0;
		}
		
	}

	//Functions for zooming out
	zoom_out = function(dest_level) {
		var admlevel_old = admlevel;
		if (dest_level === 2 && admlevel > 2) {
			admlevel = dest_level;
			parent_code = '';
			reload_dashboard(d);
		} else if (dest_level === 3 && admlevel > 3) {
			admlevel = 3;
			parent_code = level2_code;
			name_selection = name_selection_prev;
			for (var i=0;i<$('.name_selection').length;i++){ $('.name_selection')[i].innerHTML = name_selection; };
			reload_dashboard(d);
		}
		while (admlevel_old > dest_level) {
			document.getElementById('level' + admlevel_old).setAttribute('class','btn btn-secondary');
			admlevel_old = admlevel_old-1;
		} 
		document.getElementById('mapPopup').style.visibility = 'hidden';
		document.getElementById('zoomin_icon').style.visibility = 'hidden';
	};

	
	map_coloring = function(id) {		// don't define with 'var' so it's a global function

		metric = id;	
		metric_label = meta_label[id];
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };	
		quantile_range = [];
		for (i=0;i<d.Rapportage.length;i++) {
			quantile_range[i] = d.Rapportage[i][metric];
		};	
		whereGroupSum_scores.dispose();
		whereGroupSum_scores = whereDimension.group().reduceSum(function(d) { if (!meta_scorevar[metric]) {return d[metric];} else { return d[meta_scorevar[metric]];};});
		mapChart
			.group(whereGroupSum_scores)				
			.colors(d3.scale.quantile()
					.domain(quantile_range)
					.range(['#f1eef6','#bdc9e1','#74a9cf','#2b8cbe','#045a8d']))
			.colorCalculator(function(d){
				return d ? mapChart.colors()(d) : '#cccccc';
			})
			;
		dc.filterAll();
		dc.redrawAll();
		document.getElementById('mapPopup').style.visibility = 'hidden';
		document.getElementById('zoomin_icon').style.visibility = 'hidden';
	};
	
	
	//Make sure that when opening another accordion-panel, the current one collapses
	var acc = document.getElementsByClassName('card-header');
	var panel = document.getElementsByClassName('collapse');
	var active = document.getElementsByClassName('collapse in')[0];
	
	for (var i = 0; i < acc.length; i++) {
		acc[i].onclick = function() {
			var active_new = document.getElementById(this.id.replace('heading','collapse'));
			if (active.id !== active_new.id) {
				active.classList.remove('in');
			} 
			active = active_new;
		}
	}

	
	/////////////////////
	// OTHER FUNCTIONS //
	/////////////////////		
	
	//Function to open the modal with information on indicator
	info = function(id) {	// don't define with 'var' so it's a global function
		metric = id;
		metric_label = meta_label[metric];	
		metric_year = meta_year[metric];
		metric_source = meta_source[metric];
		metric_desc = meta_desc[metric];
		for (var i=0;i<$('.metric_label').length;i++){ $('.metric_label')[i].innerHTML = metric_label; };
		for (var i=0;i<$('.metric_year').length;i++){ $('.metric_year')[i].innerHTML = metric_year; };
		for (var i=0;i<$('.metric_source').length;i++){ $('.metric_source')[i].innerHTML = metric_source; };
		for (var i=0;i<$('.metric_desc').length;i++){ $('.metric_desc')[i].innerHTML = metric_desc; };
		if (!meta_icon[metric]) {metric_icon = 'img/undefined.png';}
		else {metric_icon = 'img/' + meta_icon[metric];}
		$('#infoModal').modal('show');
	};
	
	//Export to CSV function
	export_csv = function() {
		var content = d.Rapportage;
		for (var i=0;i<content.length;i++){
			content[i].name = lookup[content[i].pcode];
		};

		var finalVal = '';
		
		for (var i = 0; i < content.length; i++) {
			var value = content[i];
			var key,innerValue,result;
			if (i === 0) {
				for (key in value) {
					if (value.hasOwnProperty(key)) {
						innerValue =  key;
						result = innerValue.replace(/"/g, '""');
						if (result.search(/("|,|\n)/g) >= 0)
							result = '"' + result + '"';
						if (key !== 'pcode') finalVal += ';';
						finalVal += result;
					}
				}
			finalVal += '\n';	
			}

			for (key in value) { 
				if (value.hasOwnProperty(key)) {
					innerValue =  JSON.stringify(value[key]);
					result = innerValue.replace(/"/g, '""');
					if (result.search(/("|,|\n)/g) >= 0)
						result = '"' + result + '"';
					if (key !== 'pcode') finalVal += ';';
					finalVal += result;
				}
			}

			finalVal += '\n';
		}
		
		var download = document.getElementById('download');
		download.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(finalVal));
		download.setAttribute('download', 'export.csv');
	};
	

	
	/////////////////////////
	// RENDER MAP AND PAGE //
	/////////////////////////
	
	//Render all dc-charts and -tables
	dc.renderAll(); 
	
	map = mapChart.map();
	function zoomToGeom(geom){
		var bounds = d3.geo.bounds(geom);
		map.fitBounds([[bounds[0][1],bounds[0][0]],[bounds[1][1],bounds[1][0]]]);
	}
	zoomToGeom(d.Districts);
	
	
	
};


