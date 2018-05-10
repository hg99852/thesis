const fs = require('fs');
const EARARTree=require('./enhanced-arar.js');
const clone = require('clone');
const _ = require('underscore');

// function optimize(curNode) {
// 	// tabs;
// 	// li;
// 	var optdData = {}
// 	var chartID, optChartID;
// 	draw(chartID, curNode['ruleObject']);
// 	_.each(curNode['ruleObject'], function (ethKey, ethVal) {
// 		_.each(ethVal, function (ioKey, ioVal) {
// 			var optdData = OptimizeRule(ioVal);
// 		});
// 	});
// 	draw(optChartID, optdData);
// 	if (confirm clicked) {
// 		curNode['ruleObject'] = optdData;
// 	}
// }
// var originalAclRuleList;
function DrawAndOptimize(aclRuleList)
{
	var originalAclRuleList=clone(aclRuleList);
	let $optModal=$('#optrule-modal');
	//draw original rule 
	// console.log(record);
	console.log(aclRuleList);
	
	/**depict original ACL list*/
	if ( $('#optpage-body').hasClass('hidden') ) $('#optpage-body').removeClass('hidden');
		$('#optchart-tabs').empty();
		$('#opttab-content').empty();
		let afteroptchartID;
		var totalarray=[];
	_.each(aclRuleList['ruleObject'],(interface,interfaceIdx) => {
		console.log("interface",interface,"interfacecount",interfaceIdx);
		// console.log("intrerface",aclRuleList['ruleObject'][interface]);
		let ruleObjectETH=aclRuleList['ruleObject'][interfaceIdx];
		// console.log(ruleObjectETH);
		_.each(ruleObjectETH,(io,ioIdx) => {
			var individualvalue=[];
			// console.log("intrerface",ruleObjectETH[io]);
			individualvalue=[`${interfaceIdx}${ioIdx}`];
			console.log("b",individualvalue);
			let ruleObjectIO=ruleObjectETH[ioIdx];
			// console.log(ruleObjectIO);
			// console.log("io",ioIdx);
			let optchartID = `optchart-${interfaceIdx}${ioIdx}`;
				afterOptchartID=`afteroptchart-${interfaceIdx}${ioIdx}`;
			let $opttab = `<li id="optli-${interfaceIdx}${ioIdx}">
							<a data-toggle="tab"  href="#opttab-${interfaceIdx}${ioIdx}">${interfaceIdx} ${ioIdx}</a>
						</li>`;
			// ${eth}.${io} -> eth0.INPUT = showingTab
			// ${~~~~}.id().trim().split('-')[1].trim().split('.');
			// let $chart = `<div id="tab-${nodeName}" class="tab-pane fade"><div id="${chartID}" style="height:400px"></div></div>`;
			let $optchart = `<div id="opttab-${interfaceIdx}${ioIdx}" class="tab-pane fade " >
							<div class="row"> 
								<div class="col-xs-12" > 
									<div id="${optchartID}" style="height:400px">
									</div> 
								</div>
							</div>
							
							<div class="row "> 
								<div class="col-xs-12" >
									<div class="hidden" id="${afterOptchartID}afteroptheader"   align="center">
										<span style="font-size: 35px; padding-top: 8px; padding-bottom: 8px; font-weight: bold">
										After optimize
										</span>
									</div>
									<div class="hidden" id="${afterOptchartID}" style="height:400px">
									</div>

								</div> 
							</div>
						</div>`;
			
			$($opttab).appendTo('#optchart-tabs');
			$($optchart).appendTo('#opttab-content');
			// console.log(ruleObjectIO);
			// console.log("optchartID",optchartID);
			createHighcharts(optchartID, ruleObjectIO);
			totalarray.push(individualvalue);
		});

	});
	// console.log("a",totalarray);
	var totalarraysort=totalarray.sort();
	// console.log("c",totalarraysort[0]);

	$(`#opttab-${totalarraysort[0]}`).addClass('in active');
	$(`#optli-${totalarraysort[0]}`).addClass('active');
	/*優化的按鍵*/
	/*裡面做的是優化的計算過程*/
	$('#optrule-confirm').on('click', function () {
		_.each(aclRuleList['ruleObject'],(interface,interfaceIdx) => {
			var ruleObjectETH=aclRuleList['ruleObject'][interfaceIdx];
			_.each(ruleObjectETH,(io,ioIdx) => {
				var optimizeDATA;
				// console.log("io",io,"ioIdx",ioIdx);
				let ruleObjectIO=ruleObjectETH[ioIdx]; 
				optimizeDATA=OptimizeRuleAlg(ruleObjectIO);
				ruleObjectETH[ioIdx]=optimizeDATA;//可以這樣嗎?
				console.log(optimizeDATA);
				afterOptchartID=`afteroptchart-${interfaceIdx}${ioIdx}`;
				if ( $(`#${afterOptchartID}`).hasClass('hidden') ) 
				{
					$(`#${afterOptchartID}afteroptheader`).removeClass('hidden');
					$(`#${afterOptchartID}`).removeClass('hidden');
				}
				createHighcharts(afterOptchartID, optimizeDATA);
			});

			// console.log("new",JSON.stringify(ruleObjectETH));
			// console.log("new",ruleObjectETH);
		});

		/*把rulelist裡的rule刪減成跟優化的ruleObject得rule一樣*/
		/*可否在coonfirm以外做*/
		var rule_list_key=_.keys(aclRuleList['ruleList']);
		// console.log("list",rule_list_key);
		var copyRulelist=clone(aclRuleList['ruleList']);
		aclRuleList['ruleList']=[];
		// console.log(copyRulelist[0]);
		_.each(aclRuleList['ruleObject'],(eth,ethIdx)=> {
			console.log(eth);
			_.each(eth,(io,ioIdx)=>{
				// console.log(io);
				_.each(io,(value,idx)=>{
					// console.log(value.listOrder);
					for(var i=0; i<rule_list_key.length; i++){
						if(_.isEqual(value.listOrder, copyRulelist[rule_list_key[i]].listOrder)){
							aclRuleList['ruleList'].push(copyRulelist[rule_list_key[i]]);
							// console.log(copyRulelist[rule_list_key[i]].listOrder);
						}
					}
				});
			});
		});
		console.log("befoe",originalAclRuleList)

	});
	console.log("acllist",aclRuleList);
	$('#optrule-save').on('click',function(){
		console.log("aclRuleList",aclRuleList);
		console.log("save ok");
		return aclRuleList;  //回傳優化後的rulelist
	});
	$('#optrule-nosave').on('click',function(){
		console.log("no save");
		console.log("originalAclRuleList",originalAclRuleList)
		// $optModal.modal('hide');
		return  originalAclRuleList;////回傳原始的rulelist
	});
}

  	/**var selected=[];
	$('#checkall').on('click', function () {
		console.log("it woek");
		$("[name=choise]:checkbox:checked").each(function(){
			selected.push($(this).val());
		});
	      alert("您喜歡的水果 : " + selected.join());
		console.log("selected",selected);
		_.each(selected,(value,Idx)=>{
			console.log(selected[Idx]);
			let interface=selected[Idx].split("-");
			console.log(interface);

		});
	});**/
	
	/*var rule_list_key=_.keys(aclRuleList['ruleList']);
	console.log("list",rule_list_key);
	var copyRulelist=clone(aclRuleList['ruleList']);
	aclRuleList['ruleList']=[];
	console.log(copyRulelist[0]);
	_.each(aclRuleList['ruleObject'],(eth,ethIdx)=> {
		console.log(eth);
		_.each(eth,(io,ioIdx)=>{
			console.log(io);
			_.each(io,(value,idx)=>{
				console.log(value.listOrder);
				for(var i=0; i<rule_list_key.length; i++){
					if(_.isEqual(value.listOrder, copyRulelist[rule_list_key[i]].listOrder)){
						aclRuleList['ruleList'].push(copyRulelist[rule_list_key[i]]);
						console.log(copyRulelist[rule_list_key[i]].listOrder);
					}
				}
			});
		});
	});*/






function OptimizeRuleAlg(ruleObjectIO) {
	let originalRuleListWeight;
	let node=[], rule_exist_node=[];


	// step 1

	// cal all rule weight
	originalRuleListWeight=calOriginalWeight(ruleObjectIO);
	let copyoriginalRuleListWeight=clone(originalRuleListWeight);
	// console.log(JSON.stringify(originalRuleListWeight));

	//build arar tree (only input or output rules)將IO得ruleObject丟進Arar tree
	curNodeARARIOleaf= new EARARTree(ruleObjectIO,false,false,1,true);
	let copyArarleaf=clone(curNodeARARIOleaf['leafList']);

	_.each(curNodeARARIOleaf['leafList'],(data,dataIdx) => {
		let curNodeARARRuleList=curNodeARARIOleaf['leafList'][dataIdx]['ruleList'];
		let curNodeArarRegion=curNodeARARIOleaf['leafList'][dataIdx]['region'];

		//建立rule存在哪些arar node 得array
		curNodeARARRuleList.forEach(function (rule,rulecount) {
			rule_exist_node[rule['ruleOrder']]=rule_exist_node[rule['ruleOrder']] || [];
			rule_exist_node[rule['ruleOrder']].push(dataIdx);
		});
		// console.log(curNodeARARRuleList[0].interface,curNodeARARRuleList[0].in_out)

		//將非第0 arar node節點扣除面積，並回傳
		for(var i=1; i< curNodeARARRuleList.length; i++ ) {
			_.each(originalRuleListWeight,(caldata,caldataIdx) => {
				// console.log("idx",originalRuleListWeight[caldataIdx]);
				// console.log("data",caldata);
				if(curNodeARARRuleList[i].ruleOrder==originalRuleListWeight[caldataIdx].ruleOrder){ 
					originalRuleListWeight[caldataIdx].totalWeight=originalRuleListWeight[caldataIdx].totalWeight - curNodeArarRegion.weight;
				}
			});
		}
	});

	// console.log("rule node",rule_exist_node);
	// console.log(JSON.stringify(originalRuleListWeight));



	//掃描所有rule weight和Arar node，若是規則weight為0，則設為undefined
	_.each(originalRuleListWeight,(rule,ruleIdx) => {
		if(originalRuleListWeight[ruleIdx].totalWeight == 0) {					//尋找面積等於0得規則
			let nodecount=rule_exist_node[ruleIdx];
			// console.log("rule",ruleIdx,rule_exist_node[ruleIdx]);
			// console.log("rule_exist_node length",rule_exist_node[rulecount].length);
			_.each(curNodeARARIOleaf['leafList'],(leaf,leafIdx) => {
				let listRule= curNodeARARIOleaf['leafList'][leafIdx]['ruleList'];

					for(var i=0; i< rule_exist_node[ruleIdx].length; i++) {		//規則存在哪些arar node
						// console.log(rule_exist_node[rulecount][i]);
						if(rule_exist_node[ruleIdx][i] == leafIdx)
						for(j=0; j<listRule.length; j++) {  					//ARAR node中得rulelist Object存在哪些規則
							// console.log("listRule[j]",listRule[j]);
							if(listRule[j] != undefined) {
								if(listRule[j].ruleOrder == ruleIdx)			//ARAR node中rulelist的規則 哪些是面積==0
									listRule[j] = undefined;
								// console.log("arar rule",listRule[j]);
							}
						}
					}
			 		//curNodeARARIOleaf['leafList'][leaf]['ruleList']=_.compact( curNodeARARIOleaf['leafList'][leaf]['ruleList']);
			});
			delete ruleObjectIO[ruleIdx];
			delete originalRuleListWeight[ruleIdx];
			delete rule_exist_node[ruleIdx];
			delete copyoriginalRuleListWeight[ruleIdx];
			}
			// originalRuleListWeight[rulecount]=_.compact(originalRuleListWeight[rulecount]);
			// curNodeARARIO[rulecount]=_.compact(curNodeARARIO[rulecount]);
			// rule_exist_node[rulecount]=_.compact(rule_exist_node[rulecount]);
	});
	// console.log("rulelist",JSON.stringify(ruleObjectIO));
	// console.log("rule weight",JSON.stringify(originalRuleListWeight));
	// console.log("rule's ararnode",rule_exist_node);
	// console.log("rule copy weight",JSON.stringify(copyoriginalRuleListWeight));
		
	/*console.log("after first step array",JSON.stringify(originalRuleListWeight));
	console.log(JSON.stringify(copyoriginalRuleListWeight));
	console.log("after first array",originalRuleListWeight);
	console.log("new current  array",curNodeARARIOleaf);

	Object.keys(curNodeARARIOleaf['leafList']).forEach(function(leaf,leafcount){
		let listRule= curNodeARARIOleaf['leafList'][leaf]['ruleList'];
		// console.log(listRule);
		// for (var i = 0; i < listRule.length; i++) {
		// 	// console.log("rulelist",i,listRule[i]);
		// 	listRule=_.compact(listRule[i]) ;
		// }
	});*/

	// console.log("after remove undefined",curNodeARARIOleaf);




	/*  step2要複製 刪減前刪減後的ARAR  */
	// console.log("original rule",curNodeARARETH);
	// console.log("original leaf:",copyArarleaf);
	// console.log("in the leaf",curNodeARARIOleaf);
	let encodeObj={};
	_.each(curNodeARARIOleaf['leafList'],(data,dataIdx) => {
		let curNodeARARRuleList=curNodeARARIOleaf['leafList'][dataIdx]['ruleList'];
		let curNodeARARRuleListRegion=curNodeARARIOleaf['leafList'][dataIdx]['region'];
		let oneObj={};

		// 尋找同位置的rule和其action
		_.each(curNodeARARRuleList,(rule,rulecount) => {
			encodeObj[dataIdx]=oneObj;
			if(rule!=undefined){
				oneObj['weight']=curNodeARARRuleListRegion.weight;
				oneObj[rule['ruleOrder']]=rule.action;
			}
		});
		/*array location cal*/

		/*let curNodeARARRuleListparameter=curNodeARARIOleaf['leafList'][data]['parameter'];
		let curNodeARARRuleListRegion=curNodeARARIOleaf['leafList'][data]['region'];
		let level=curNodeARARRuleListparameter.nodeLevel;
		let segtime=curNodeARARRuleListparameter.segTimes;
		let levelenght=(level-(segtime-1));
		let encode_locate=[];
		encode_locate_des=curNodeARARRuleListRegion.min_dip;
		encode_locate_src=curNodeARARRuleListRegion.min_sip;

		console.log(curNodeARARRuleList[0].interface,curNodeARARRuleList[0].in_out);
		console.log("arar node ",data);
		console.log("move time",levelenght,"level",level,"segtime",segtime);
		console.log("min_dip",curNodeARARRuleListRegion['min_dip'],"min_sip",curNodeARARRuleListRegion.min_sip);


		console.log("des:",encode_locate_des,"2 bit:",encode_locate_des.toString(2),"length: ",encode_locate_des.toString(2).length);
		console.log("src:",encode_locate_src,"2 bit:",encode_locate_src.toString(2),"length: ",encode_locate_src.toString(2).length);
		encode_locate_des>>=encode_locate_des.toString(2).length-levelenght;
		encode_locate_src>>=encode_locate_src.toString(2).length-levelenght;
		console.log("after delete :")
		console.log("des:",encode_locate_des,"2 bit:",encode_locate_des.toString(2),"length: ",encode_locate_des.toString(2).length);
		console.log("src:",encode_locate_src,"2 bit:",encode_locate_src.toString(2),"length: ",encode_locate_src.toString(2).length);

		arrray['location']=[encode_locate_des,encode_locate_des];
		encode_arrray.push(arrray);
		console.log(curNodeARARRuleList);*/
	});
	// console.log(JSON.stringify(originalRuleListWeight));
	// console.log("rule_exist_node",JSON.stringify(rule_exist_node));
	// console.log("ARAR node",JSON.stringify(encodeObj));
	// console.log("after first step curNodeARARIO",JSON.stringify(curNodeARARIO));
	// let new_curNodeARARIO=_.compact(curNodeARARIO);
	// console.log("new_curNodeARARIO",new_curNodeARARIO);
	// console.log("arar node include rule and its action",encodeObj);
	/*
	 * step 2 
	 *
	 */
	var rulelist_key=_.keys(ruleObjectIO);
	var ararnode_key=_.keys(encodeObj);
			// var ararnode_key=_.keys(encodeObjrule['ruleOrder']);
	for(var i=0; i<rulelist_key.length; i++) {
		var cerrentElement=ruleObjectIO[rulelist_key[i]];
		var nextElement=ruleObjectIO[rulelist_key[i+1]];
		// console.log("rule order",rulelist_key[i]);
		// console.log("cerrentElement ",cerrentElement);
		// console.log("nextElement",nextElement);
		if(nextElement != undefined) {
			if(cerrentElement.action == nextElement.action)							//先比較rule action，若相同在進行比較位置的編碼值
			{
				// console.log("cerrentElement action",cerrentElement.action);
				// console.log("nextElement action",nextElement.action);
				for (var j = 0; j < ararnode_key.length; j++) { 					//取位置(arar node) 編碼值
					// console.log("encodeObj",j,JSON.stringify(encodeObj[ararnode_key[j]]));
					var ruleorder_key = _.keys( encodeObj[ararnode_key[j]] );
					var newencodeObj = encodeObj[ararnode_key[j]];
					// console.log("j",encodeObj[ararnode_key[j]].ruleorder_key);
					// console.log("encodeObjlength",ruleorder_key);
					for (var x = 0; x < ruleorder_key.length; x++) {				
						// console.log("x",ruleorder_key[x],"ruleOrder",rulelist_key[i]);
						if(ruleorder_key[x] == rulelist_key[i]){					//位置(arar node) 中的規則action比較，若相同則刪除order較小的rule面積
							var currentRuleOrder = newencodeObj[ruleorder_key[x]];
							var nextRuleOrder = newencodeObj[ruleorder_key[x+1]];
							// console.log("ruleorder",newencodeObj[ruleorder_key[x]]);
							// console.log("currentRuleOrder",currentRuleOrder );
							// console.log("nextRuleOrder",nextRuleOrder );
							// console.log("ARAR node weight",newencodeObj.weight)
							// if(copyoriginalRuleListWeight[ruleorder_key[x]] != null)
							// console.log("original weight",ruleorder_key[x],copyoriginalRuleListWeight[ruleorder_key[x]].totalWeight);
							if(ruleorder_key[x] != "weight") {
								if(nextRuleOrder != undefined ) {
									if(currentRuleOrder == nextRuleOrder) {
										if(copyoriginalRuleListWeight[ruleorder_key[x]] != null){
											copyoriginalRuleListWeight[ruleorder_key[x]].totalWeight = copyoriginalRuleListWeight[ruleorder_key[x]].totalWeight - newencodeObj.weight//比較 node 中的rule action，若相同，扣除order較小的規則面積
											// console.log("optimial weight",ruleorder_key[x],copyoriginalRuleListWeight[ruleorder_key[x]].totalWeight);
										}
									}
								}
							}
						}
					}
					// console.log(copyoriginalRuleListWeight);
					// console.log(JSON.stringify(copyoriginalRuleListWeight));
				}
			}
		}
	}
	_.each(copyoriginalRuleListWeight,(rule,ruleIdx)=> {
		if(copyoriginalRuleListWeight[ruleIdx] != undefined) {
			if(copyoriginalRuleListWeight[ruleIdx].totalWeight==0) {
				let nodecount=rule_exist_node[ruleIdx];
				// console.log("rule",rulecount,rule_exist_node[rulecount]);
				// console.log("rule_exist_node length",rule_exist_node[rulecount].length);		

				_.each(curNodeARARIOleaf['leafList'],(leaf,leafIdx)=> {
					let listRule= curNodeARARIOleaf['leafList'][leafIdx]['ruleList'];

					if(rule_exist_node[ruleIdx] != undefined){
						for(var i=0; i<rule_exist_node[ruleIdx].length; i++) {//規則有哪些arar node
						// console.log(rule_exist_node[rulecount][i]);
							if(rule_exist_node[ruleIdx][i] == leafIdx)
							for(j=0;j<listRule.length;j++){//ARAR node中得rulelist存在哪些規則
								// console.log("listRule[j]",listRule[j]);
								if(listRule[j] != undefined){
									if(listRule[j].ruleOrder == ruleIdx)//ARAR node中rulelist的規則 哪些是面積==0
										listRule[j]=undefined;
									// console.log("arar rule",listRule[j]);
								}
							}
						}
					}

					
					delete ruleObjectIO[ruleIdx];
					delete rule_exist_node[ruleIdx];
					delete copyoriginalRuleListWeight[ruleIdx];
				});
			}
		}
		
	});
	ruleObjectIO=_.compact(ruleObjectIO);
	// console.log(ruleObjectIO);

	// console.log('test');
	return ruleObjectIO;
}



function ARARRule ( eth,inout,ruleOrder,listOrder, min_sip, max_sip, min_dip, max_dip, flag, isExchange ) {
	this.eth=eth;
	this.inout=inout;
	this.ruleOrder=ruleOrder;
	this.listOrder = listOrder;
	this.min_sip = min_sip;
	this.max_sip = max_sip;
	this.min_dip = min_dip;
	this.max_dip = max_dip;
	this.flag = flag;
	this.isExchange = isExchange;
}

function WeightSeries ( eth,inout,ruleOrder,listOrder,totalWeight) {
	this.eth=eth;
	this.inout=inout;
	this.ruleOrder=ruleOrder;
	this.listOrder = listOrder;
	this.totalWeight=totalWeight;
}

function weightDataConvertor ( dataList ) {
	let convertornewDataList = [];
	// console.log(JSON.stringify(dataList));
	for (let dataCount=0; dataCount<dataList.length; dataCount++) {
		let data = dataList[dataCount];
		let newData, src_ip, dest_ip, flag = false;
		src_ip = new AddressPrefixObject(data['src_ip']);
		dest_ip = new AddressPrefixObject(data['dest_ip']);
		newData = new ARARRule(data['interface'],data['in_out'],data['ruleOrder'],data['listOrder'], src_ip['ipMinNumber'], src_ip['ipMaxNumber'], dest_ip['ipMinNumber'], dest_ip['ipMaxNumber'], flag, data['isExchange']);
		// console.log(newData);
		convertornewDataList.push(newData);
	}
	return convertornewDataList;
}

function calOriginalWeight ( ruleList ) {
	let seriesList = [];
	ruleList = weightDataConvertor(ruleList);
	let newDataList = [];
	for (let dataCount=0; dataCount<ruleList.length; dataCount++) {
		let data = ruleList[dataCount];
		let sourcelenght,Destlenght,totalWeight;
		totalWeight=(data['max_sip']-data['min_sip']+1)*(data['max_dip']-data['min_dip']+1);
		// console.log(`totalWeight:${totalWeight}`)				
		newData = new WeightSeries(data['eth'],data['inout'],data['ruleOrder'],data['listOrder'],totalWeight );
		newDataList.push(newData);
	}
	return newDataList;
}





function createHighcharts ( chartID, dataList ) {
	console.log("chartID",chartID);
	let chart = {
		chart: { type: 'heatmap', zoomType: 'xy'},
		title: { text: null },
		tooltip: { 
			followPointer: true,
			useHTML: true,
			headerFormat: `<div class="center" style="font-size: 14px; font-weight: bold">{series.name}</div></hr><div><table>`,
			footerFromat: '</table></div>',
			pointFormatter: function () {
				var str =	`<tr><td>Src:&#160;</td>\
								<td>${ipConvertor(this.series.xData[0])}</td>\
								<td>&#160;~&#160;</td>\
								<td>${ipConvertor(this.series.xData[1])}</td>\
							</tr>\
							<tr>\
								<td>Dest:&#160;</td>\
								<td>${ipConvertor(this.low)}</td>\
								<td>&#160;~&#160;</td>\
								<td>${ipConvertor(this.high)}</td>\
							</tr>`;
				
				return str;
			},
		},

		plotOptions: {
			series: {
				stickyTracking: true,
				trackByArea: true,
				showInLegend: true,
				fillOpacity: 0.5,
				lineWidth: 0.5,
				marker: { enabled: false, states: { hover: { enabled: false } } },
				cursor: 'pointer',

			}
		},
		xAxis: {
			text: 'Source IP Address',
			title: "Source Address",
			labels: { formatter: function () { return ipConvertor(this.value); } },
			floor: 0,
			ceiling: 4294967295,
		},

		yAxis: {
			text: 'Destination IP Address',
			title: "Destination Address",
			labels: { formatter: function () { return ipConvertor(this.value); } },
			floor: 0,
			ceiling: 4294967295,
		}
		
	};

	chart.series = createSeries(dataList);
	// console.log("chart.series",chart.series);
	// console.log("chartID",chartID);
	// console.log("chart",chart);
	Highcharts.chart(chartID, chart);
	 // Highcharts.Color(dataList.color).brighten(-0.3).get('rgb')

	// console.log("high");
}

function createSeries ( ruleList ) {
	// console.log(`in createSeries nodeName:${nodeName}`);
	let seriesList = [];
	// console.log(ruleList);
	ruleList = inputDataConvertor(ruleList);
	// console.log(ruleList);
	ruleList=_.compact(ruleList);
	// console.log("after compact",JSON.stringify(ruleList));
	ruleList.forEach(function ( data, dataCount ) {
		// console.log(data);
		let SourceLength,DestinationLength,series;
		SourceLength = (data.max_sip - data.min_sip)+1;
		DestinationLength = (data.max_dip - data.min_dip)+1;
		// console.log(SourceLength);
		// console.log(DestinationLength);
		var dataRange = [{ x: data.min_sip, low: data.min_dip, high: data.min_dip + DestinationLength }, { x: data.min_sip + SourceLength, low: data.min_dip, high: data.min_dip + DestinationLength }],
	        dataSource = { start: ipConvertor(data.min_sip), end: ipConvertor(data.max_sip) },
	        dataDestination = { start: ipConvertor(data.max_dip), end: ipConvertor(data.min_dip) };
			// console.log(ipConvertor(data.min_sip));           		
			// console.log(dataSource);           		
			// console.log(dataDestination); 
			datacolor='#000000'	; 
			if(data.action=='DROP')
				datacolor='#888888';   
			else
				datacolor='#000000'	;
			series = { 
				name: ` Rule ${data.ruleOrder} ${data.action}`,
			 // followPointer: false, 
			 // enableMouseTracking: false,
			 trackByArea: true ,
			 showInLegend: true, 
			 type: 'arearange', 
			 lineWidth: 1.5, 
			 lineColor: Highcharts.getOptions().colors[1],
			 color: Highcharts.getOptions().colors[dataCount] , 
			 fillOpacity:1, 
			 data: dataRange, 
			 // ruleOrder: data.ruleOrder, 
			 source: dataSource, 
			 destination: dataDestination, 
			 
			  };
			  // console.log(series);
		// series=series.reverse();
		seriesList.push(series);
	});
	seriesList.reverse();
return seriesList;
}


function inputDataConvertor ( dataList ) {
	let newDataList = [];
	// console.log("in put",dataList);
	for (let dataCount=0; dataCount<dataList.length; dataCount++) {
		let data = dataList[dataCount];
		if(dataList[dataCount] != null){
			let newData, src_ip, dest_ip, flag = false;
			src_ip = new AddressPrefixObject(data['src_ip']);
			dest_ip = new AddressPrefixObject(data['dest_ip']);
			if ( data['tcp_flags'].length > 0 ) flag = true;
			newData = new myARARRule(data['interface'],data['in_out'],data['ruleOrder'],data['listOrder'], src_ip['ipMinNumber'], src_ip['ipMaxNumber'], dest_ip['ipMinNumber'], dest_ip['ipMaxNumber'], flag, data['isExchange'],data['action']);
			newDataList.push(newData);
		}
	}
	return newDataList;
}

function myARARRule ( eth,inout,ruleOrder,listOrder, min_sip, max_sip, min_dip, max_dip, flag, isExchange,action ) {
	this.eth=eth;
	this.inout=inout;
	this.ruleOrder=ruleOrder;
	this.listOrder = listOrder;
	this.min_sip = min_sip;
	this.max_sip = max_sip;
	this.min_dip = min_dip;
	this.max_dip = max_dip;
	this.flag = flag;
	this.isExchange = isExchange;
	this.action=action
}

module.exports = DrawAndOptimize;
// module.exports = OptimizeRuleAlg;