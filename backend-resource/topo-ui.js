"use strict";
const pictures = `${__dirname}/pictures`;
// const nodeDoubleClickModal = `${__dirname}/templates/firewall-modal.html`;
const path = require('path');
const fs = require('fs');
const deepcopy = require('deepcopy');
const {dialog} = require('electron').remote;
const ACLObject = require( './acl-file-parser.js');
const modalDepict = require( './modal-depict.js');
const util = require('util');
const Optimize =require('./optimize.js');
const clone = require('clone');


let $s, myOperate, myDiagram, curThesisObj;
let nodeSelected, curNodeACLObj;
let preAction, curAction = 'topo-pointer-button';


function diagramOperate () {
	let nwCount = 0, fwCount = 0;
	this.mode = 'pointer';
	this.itemType = 'pointer';
	
	curThesisObj.nodeDataArray.forEach( function (node) {
		if ( node.category === 'firewall' ) { fwCount += 1; }
		else if ( node.category === 'network' ) { nwCount += 1; }
	});

	this.nodeCounter = { network: nwCount, firewall: fwCount };
}

/*	[Topology Button Handler]
 *	Pointer:	initial function, a 
 *	Firewall:	click at diagram to create a new 'firewall' node
 *	Network:	click at diagram to create a new 'network' node
 *	Link:		drag and 'link' from a node to another node
 *	
 *	
 */
$('input[name="function-button"]').change( function ( e ) {
	// console.log(e.target.value);
	preAction = curAction;
	curAction = e.currentTarget.parentNode.id;
	if ( preAction !== undefined ) 
		$(`#${preAction}`).removeClass('btn-light');
	$(`#${curAction}`).addClass('btn-light');
	let mode, itemType;
	myDiagram.startTransaction();


	// if ( e.target.value == 'firewall' || e.target.value == 'network' ) {
	// 	mode = 'node';
	// 	itemType = e.target.value;
	// } else {
	// 	mode = e.target.value;
	// 	itemType = e.target.value;
	// }

	itemType = e.target.value;
	if ( itemType === 'firewall' || itemType === 'network' )	mode = 'node';
	else	mode = itemType;


	myOperate.mode = mode;
	myOperate.itemType = itemType;

	if (mode === "pointer") {
		myDiagram.allowLink = false;
		myDiagram.nodes.each(function(n) { n.port.cursor = ""; });
	} else if (mode === "node") {
		myDiagram.allowLink = false;
		myDiagram.nodes.each(function(n) { n.port.cursor = ""; });
	} else if (mode === "link") {
		myDiagram.allowLink = true;
		myDiagram.nodes.each(function(n) { n.port.cursor = "pointer"; });
	}

	myDiagram.commitTransaction("mode changed");
});




/*	[generate button Handler]
 *	
 */
$('button[id="project-generate-button"]').attr('type', 'button').on('click', function () {
	console.log('generate-button pressed');
	let modalHTMLPath, modalHTMLData, $modal, $confirm;

	modalHTMLPath = `${__dirname}/templates/generate-modal.html`;
	modalHTMLData = fs.readFileSync(modalHTMLPath, 'utf-8').toString();
	$(modalHTMLData).insertAfter('#main-container');

	$modal = $('#generate-modal');
	$confirm = $('#modal-confirm-button');

	$modal.on('show.bs.modal', function () {
		$confirm.on('click', function () {
			console.log('confirm');
			let nodeData;
			// counter = {
			// 	network: document.getElementById('network-spinner').value,
			// 	firewall: document.getElementById('firewall-spinner').value,
			// 	rule: document.getElementById('rule-spinner').value,
			// };
			curThesisObj['geneInfo'] = {
				rangeSize: $('input[name="range-radio"]:checked').val(),
				network: document.getElementById('network-spinner').value,
				firewall: document.getElementById('firewall-spinner').value,
				rule: document.getElementById('rule-spinner').value,
				useCurTopo: document.getElementById('gene-rule-only').checked
			};

			if ( !curThesisObj['geneInfo']['useCurTopo'] ) {
				Object.keys(curThesisObj['geneInfo']).forEach(function ( nodeType, typeCount ) {
					if ( nodeType === 'rule' ) return;
					else if ( nodeType === 'rangeSize' ) return;
					else if ( nodeType === 'useCurTopo' ) return;
					for (let i=0; i<curThesisObj['geneInfo'][nodeType]; i++) {
						if ( nodeType === 'network' ) {
							myDiagram.model.addNodeData(new NewNode(nodeType, `${i+1}.0.0.0/8`));
						}
						else myDiagram.model.addNodeData(new NewNode(nodeType));
					}
				});

				linkNode();
			}

			let curPath = new myTopology(curThesisObj.nodeDataArray, curThesisObj.linkDataArray);
			ruleGenerator(curThesisObj.aclObject, curPath.generateObject, curThesisObj['geneInfo'].rule, curThesisObj['geneInfo'].rangeSize);



			$modal.modal('hide');

			function NewNode ( nodeType, address=undefined ) {
				myOperate['nodeCounter'][nodeType]++;
				
				this.key = `${nodeType}${myOperate['nodeCounter'][nodeType]}`;
				this.category = `${nodeType}`;
				
				return this;
			}

			function linkNode () {
				let nodeArray = {
					network: [],
					firewall: []
				};
				curThesisObj.nodeDataArray.forEach(function ( curNode, curNodeCount ) {
					nodeArray[curNode.category].push(curNode);
				});

				// nw <--> fw
				nodeArray['network'].forEach(function ( curNode, curNodeCount ) {
					myDiagram.model.addLinkData({
						category: 'link',
						from: curNode.key,
						to: nodeArray['firewall'][randomValue(0, nodeArray['firewall'].length-1)].key,
						text: 'link'
					});
				});

				// fw <--> fw
				nodeArray['firewall'].forEach(function ( fromNode, fromNodeCount ) {
					let sliceNodeArray = nodeArray['firewall'].slice(fromNodeCount+1, nodeArray['firewall'].length);
					let linkCount = 0;

					if ( sliceNodeArray.length === 0 ) return;
					

					for (let toNodeCount=0; toNodeCount<sliceNodeArray.length; toNodeCount++) {
						let toNode = sliceNodeArray[toNodeCount];
						let randomRatio = 0;
						if ( sliceNodeArray.length > 50 ) randomRatio = 1;
						else if ( sliceNodeArray.length > 25 ) randomRatio = 2;
						else randomRatio = 3;


						if ( randomValue(0, randomRatio) ) {
							myDiagram.model.addLinkData({
								category: 'link',
								from: fromNode.key,
								to: toNode.key,
								text: 'link'
							});
							linkCount++;
						}
					}

					if ( linkCount === 0 ) {
						myDiagram.model.addLinkData({
							category: 'link',
							from: fromNode.key,
							to: sliceNodeArray[randomValue(0, sliceNodeArray.length-1)].key,
							text: 'link'
						});
					}
				});
			}



		});


		$('#network-spinner').ace_spinner({
			value: 2,
			min: 2,
			max: 3,
			step: 1,
			// on_sides: true,
			icon_up:'ace-icon fa fa-plus bigger-110',
			icon_down:'ace-icon fa fa-minus bigger-110',
			btn_up_class:'btn-success',
			btn_down_class:'btn-danger'
		});

		$('#firewall-spinner').ace_spinner({
			value: 1,
			min: 1,
			max: 5,
			step: 1,
			// on_sides: true,
			icon_up:'ace-icon fa fa-plus bigger-110',
			icon_down:'ace-icon fa fa-minus bigger-110',
			btn_up_class:'btn-success',
			btn_down_class:'btn-danger'
		});

		$('#rule-spinner').ace_spinner({
			value: 5,
			min: 5,
			max: 500,
			step: 25,
			// on_sides: true,
			icon_up:'ace-icon fa fa-plus bigger-110',
			icon_down:'ace-icon fa fa-minus bigger-110',
			btn_up_class:'btn-success',
			btn_down_class:'btn-danger'
		});

	});

	$modal.on('shown.bs.modal', function () {});
	$modal.on('hide.bs.modal', function () {});
	$modal.on('hidden.bs.modal', function () {
		$modal.remove();
	});
	// start to show
	$modal.modal('show');
});




/*	[init]
 *	Initial topology diagram setting.
 */
function init ( thesisObject ) {
	$s = go.GraphObject.make;
	curThesisObj = thesisObject;
	myOperate = new diagramOperate();

	myDiagram = $s(go.Diagram, 'topo-diagram', {
		initialContentAlignment: go.Spot.Center,
		allowLink: false,	// linking is only started via buttons, not modelessly
		// 'undoManager.isEnabled': true
		"animationManager.isEnabled": false,
		"linkingTool.portGravity": 0,	// no snapping while drawing new links
		"linkingTool.doActivate": function() {
			// change the curve of the LinkingTool.temporaryLink
			this.temporaryLink.curve = go.Link.Normal;
			this.temporaryLink.path.stroke = 'black';
			this.temporaryLink.path.strokeWidth = 2;
			go.LinkingTool.prototype.doActivate.call(this);
		},

		// override the link creation process
		"linkingTool.insertLink": function(fromnode, fromport, tonode, toport) {
			// to control what kind of Link is created,
			// change the LinkingTool.archetypeLinkData's category
			myDiagram.model.setCategoryForLinkData(this.archetypeLinkData, myOperate.itemType);
			// Whenever a new Link is drawng by the LinkingTool, it also adds a node data object
			// that acts as the label node for the link, to allow links to be drawn to/from the link.
			this.archetypeLabelNodeData = (myOperate.itemType === "flow") ? { category: "valve" } : null;
			// also change the text indicating the condition, which the user can edit
			this.archetypeLinkData.text = myOperate.itemType;
			return go.LinkingTool.prototype.insertLink.call(this, fromnode, fromport, tonode, toport);
		},

		"clickCreatingTool.archetypeNodeData": {},  // enable ClickCreatingTool
		"clickCreatingTool.isDoubleClick": false,   // operates on a single click in background
		"clickCreatingTool.canStart": function() {  // but only in "node" creation mode
			return myOperate.mode === 'node' && go.ClickCreatingTool.prototype.canStart.call(this);
		},
		"clickCreatingTool.insertPart": function ( loc ) {  // customize the data for the new node
			myOperate.nodeCounter[myOperate.itemType] += 1;
			// console.log(myOperate.nodeCounter);
			var newNodeId = myOperate.itemType + myOperate.nodeCounter[myOperate.itemType];
			this.archetypeNodeData = {
				key: newNodeId,
				category: myOperate.itemType
			};
			return go.ClickCreatingTool.prototype.insertPart.call(this, loc);
		}
	});

	// install the NodeLabelDraggingTool as a "mouse move" tool
	// myDiagram.toolManager.mouseMoveTools.insertAt(0, new NodeLabelDraggingTool());

	// when the document is modified, add a "*" to the title and enable the "Save" button
	myDiagram.addDiagramListener("Modified", function(e) {
		// var button = document.getElementById("SaveButton");
		// if (button) button.disabled = !myDiagram.isModified;
		var idx = document.title.indexOf("*");
		if (myDiagram.isModified) {
			if (idx < 0) document.title += "*";
		} else {
			if (idx >= 0) document.title = document.title.substr(0, idx);
		}
	});

	buildTemplates();
	update(curThesisObj);
}

function clear () {}

function update ( thesisObject ) {
	myDiagram.clear();
	curThesisObj = thesisObject;
	myOperate = new diagramOperate();
	myDiagram.model = new go.GraphLinksModel(curThesisObj.nodeDataArray, curThesisObj.linkDataArray);

	// add modelchangedlistener
	myDiagram.model.addChangedListener(function ( e ) {
		let changedValue;
		// do not display some uninteresting kinds of transaction notifications
		if ( e.change === go.ChangedEvent.Transaction ) {
			if ( e.propertyName === "CommittingTransaction" || e.modelChange === "SourceChanged" ) return;
			// do not display any layout transactions
			if ( e.oldValue === "Layout" ) return;
		}  // You will probably want to use e.isTransactionFinished instead

		// handle the event of insert or remove a node
		if ( e.change.name === 'Insert' ) {
			// do when insert a new node
			changedValue = e.newValue;
			if ( changedValue.category === 'link' ) return;
			else if ( changedValue.category === 'network' ) {
				// console.log(changedValue);
				changedValue['address'] = `${myOperate.nodeCounter['network']}.0.0.0/8`;
			} else {
				curNodeACLObj = new ACLObject(changedValue.key);
				curThesisObj['aclObject'][changedValue.key] = curNodeACLObj;
			}

		} else if ( e.change.name === 'Remove' ) {
			// do when remove a old node
			changedValue = e.oldValue;
			if ( changedValue.category === 'link' ) return;
			else if ( changedValue.category === 'network' ) return;
			delete curThesisObj['aclObject'][changedValue.key];
			// console.log('Remove a node:');
			// console.log(changedValue);
		}
	});
}



function nodeDoubleClicked ( e, obj ) {
	// console.log('node been double-clicked');
	nodeSelected = obj.part.data;
	buildModal(nodeSelected.category);
	console.log(nodeSelected);
}



function buildTemplates () {

	function textStyle() {}
	function nodeStyle() {}
	function firewallStyle() {}
	function networkStyle() {}



	myDiagram.nodeTemplateMap.add('firewall',
		$s(go.Node, 'Vertical', 
			{ 
				doubleClick: nodeDoubleClicked,
				fromLinkable: true,
				toLinkable: true
			},
			$s(go.TextBlock, 'Default Text', 
				{ font: "bold 16px sans-serif" },
				new go.Binding('text', 'key')),
			$s(go.Picture, 
				// { source: `${pictures}/firewall-gray.png`, width: 50, height: 50 }
				{ source: `${pictures}/firewall.png`, width: 50, height: 50 }
				)));

	myDiagram.nodeTemplateMap.add('network',
		$s(go.Node, 'Vertical',
			{
				doubleClick: nodeDoubleClicked,
				fromLinkable: true,
				toLinkable: true
			},
			$s(go.TextBlock, 'Default Text', 
				{ font: "bold 16px sans-serif" },
				new go.Binding('text', 'key')),
			$s(go.Picture, 
				{ source: `${pictures}/network.png`, width: 50, height: 50 })
			));

	myDiagram.linkTemplateMap.add('', $s(go.Link, $s(go.Shape)));
	myDiagram.linkTemplateMap.add('link', $s(go.Link, $s(go.Shape)));
}



module.exports.init = init;
module.exports.update = update;





function buildModal ( modalType ) {
	let modalHTMLPath, modalHTMLData;
	let $modal, $confirmButton;

	if ( modalType === 'network' ) {
		modalHTMLPath = `${__dirname}/templates/network-modal.html`;
		modalHTMLData = fs.readFileSync(modalHTMLPath, 'utf-8').toString();
		$(modalHTMLData).insertAfter('#main-container');
		// console.log(nodeSelected);
		let [addr, mask] = (nodeSelected.address).split('/');
		let [addr1st, addr2nd, addr3rd, addr4th] = addr.split('.');

		$modal = $('#network-doubleclick-modal');
		$confirmButton = $('#modal-confirm-button');


		$modal.on('show.bs.modal', function () {
			$('#network-doubleclick-modal .modal-header h1').text(nodeSelected.key);

			$('#addr1st-spinner').ace_spinner({
				value: addr1st,
				min: 0,
				max: 255,
				step: 1,
				// on_sides: true,
				icon_up:'ace-icon fa fa-plus bigger-110',
				icon_down:'ace-icon fa fa-minus bigger-110',
				btn_up_class:'btn-success',
				btn_down_class:'btn-danger'
			});
			$('#addr2nd-spinner').ace_spinner({
				value: addr2nd,
				min: 0,
				max: 255,
				step: 1,
				// on_sides: true,
				icon_up:'ace-icon fa fa-plus bigger-110',
				icon_down:'ace-icon fa fa-minus bigger-110',
				btn_up_class:'btn-success',
				btn_down_class:'btn-danger'
			});
			$('#addr3rd-spinner').ace_spinner({
				value: addr3rd,
				min: 0,
				max: 255,
				step: 1,
				// on_sides: true,
				icon_up:'ace-icon fa fa-plus bigger-110',
				icon_down:'ace-icon fa fa-minus bigger-110',
				btn_up_class:'btn-success',
				btn_down_class:'btn-danger'
			});
			$('#addr4th-spinner').ace_spinner({
				value: addr4th,
				min: 0,
				max: 255,
				step: 1,
				// on_sides: true,
				icon_up:'ace-icon fa fa-plus bigger-110',
				icon_down:'ace-icon fa fa-minus bigger-110',
				btn_up_class:'btn-success',
				btn_down_class:'btn-danger'
			});
			$('#mask-spinner').ace_spinner({
				value: mask,
				min: 0,
				max: 32,
				step: 1,
				// on_sides: true,
				icon_up:'ace-icon fa fa-plus bigger-110',
				icon_down:'ace-icon fa fa-minus bigger-110',
				btn_up_class:'btn-success',
				btn_down_class:'btn-danger'
			});
		});
		$modal.on('shown.bs.modal', function () {});
		$modal.on('hide.bs.modal', function () {});
		$modal.on('hidden.bs.modal', function () {
			$modal.remove();
		});

		// start to show
		$modal.modal('show');

		$confirmButton.on('click', function () {
			console.log('confirm');
			addr1st = document.getElementById('addr1st-spinner').value;
			addr2nd = document.getElementById('addr2nd-spinner').value;
			addr3rd = document.getElementById('addr3rd-spinner').value;
			addr4th = document.getElementById('addr4th-spinner').value;
			mask = document.getElementById('mask-spinner').value;
			nodeSelected.address = `${addr1st}.${addr2nd}.${addr3rd}.${addr4th}/${mask}`;
			// console.log(`nodeSelected.address:${nodeSelected.address}`);
			$modal.modal('hide');
		});
	}
	else if ( modalType === 'firewall' ) {
		let newACLObj = curThesisObj['aclObject'][nodeSelected.key];
		console.log(newACLObj);
		// console.log( util.inspect(newACLObj, { showHidden: false, depth: null }) ); 
		let record = { isModified: false, showing: undefined, exist: {}, in_out: {} };
		// console.log("record",JSON.stringify(record));

		modalHTMLPath = `${__dirname}/templates/firewall-modal.html`;
		modalHTMLData = fs.readFileSync(modalHTMLPath, 'utf-8').toString();
		$(modalHTMLData).insertAfter('#main-container');

		let ruleButtons = fs.readFileSync(`${__dirname}/templates/rule-buttons.html`, 'utf-8').toString();
		let addRuleModalHtml = fs.readFileSync(`${__dirname}/templates/addrule-modal.html`, 'utf-8').toString();
		let optRuleModalHtml = fs.readFileSync(`${__dirname}/templates/optrule-modal.html`, 'utf-8').toString();
		let $importButton, $exportButton, $addRuleButton,$optRuleButton;

		$modal = $('#firewall-doubleclick-modal');
		$confirmButton = $('#modal-confirm-button');
		$importButton = $('#import-acl-button');
		$exportButton = $('#export-acl-button');
		$addRuleButton = $('#add-rule-button');
		$optRuleButton=$('#opt-rule-button');

		$modal.on('show.bs.modal', function ( event ) {
			if ( event.target.id !== 'firewall-doubleclick-modal' ) { return; }
			$('#modal-title').text(nodeSelected.key);
			console.log("Firewall click")
			createACLTable();
		});

		$modal.on('shown.bs.modal', function () {});
		$modal.on('hide.bs.modal', function () {});

		$modal.on('hidden.bs.modal', function ( event ) { 
			if ( event.target.id !== 'firewall-doubleclick-modal' ) { return; }
			$modal.remove();
		});
		var depictObj=clone(newACLObj['ruleObject']);
		var depicThesistObj=clone(curThesisObj['aclObject']);
		console.log(depictObj);

		// console.log(newACLObj);
		Object.keys(depictObj).sort().forEach(function ( eth, ethCount ) {
			// console.log(newACLObj['ruleObject']);
			Object.keys(depictObj[eth]).sort().forEach(function ( io, ioCount ) {
				// console.log(eth);
				// console.log(record.in_out[io]);
				if ( !record.in_out.hasOwnProperty(io) ) { record.in_out[io] = true; }
				// console.log(io);
				});
		});
		$optRuleButton.on('click',function (){
			
			// $modal.on('shown.bs.modal', function () {});
			console.log('optimize success');
			$(optRuleModalHtml).modal('show');
			// $(optRuleModalHtml).addClass('aside').ace_aside({container: '#firewall-doubleclick-modal > .modal-dialog'});
			let $optModal=$('#optrule-modal');
			let $inputbtn=$('#topo-Input-button');
			let showingEth;
			
			$('#acl-tabs').children().each(function ( index, value ) {
				if ( $(value).hasClass('active') ) { [showingEth ] = value.id.split('-'); }
				
			});
			if ( showingEth === undefined ) { alert('Please add a interface tab before add a rule.'); return; }

			record.showing = parseInt(showingEth.split('eth')[1]);
			console.log(record);
			
				
				
			$optModal.on('show.bs.modal',function () {
				// $('#optrule-title').text(`  ${showingEth}  optimize`);	
				let curNodeARARETH=newACLObj;
				console.log(curNodeARARETH);								
				curNodeARARETH=Optimize(curNodeARARETH);
				console.log("after optimize",curNodeARARETH);
			});




			$optModal.on('shown.bs.modal', function () {});
			$optModal.on('hide.bs.modal', function () {});
			$optModal.on('hidden.bs.modal', function () { $optModal.remove(); });
			// $('#optrule-confirm').on('click', function () {
			// 	// alert("optrule-confirm");
			// 	let curNodeARARETH=newACLObj;
			// 	// console.log("curNode: ",curNodeARARETH);
			// 	curNodeARARETH=optimize(curNodeARARETH, record);
			// 	curNodeARARETH=_.compact(curNodeARARETH);

			// });

			$('#optrule-window-close').on('click', function () {
				console.log('optrule-window-close');
				console.log("after optimize",newACLObj);
				$optModal.modal('hide');
			});

			$('#optrule-close').on('click', function () {
				console.log('optrule-close');
				$optModal.modal('hide');

			});

			$optModal.modal('show');
			console.log("win open");
			


		});



		$addRuleButton.on('click', function () {
			console.log('addrule');
			
			$(addRuleModalHtml).addClass('aside').ace_aside({container: '#firewall-doubleclick-modal > .modal-dialog'});
			let $addRuleModal = $('#addrule-modal');
			let showingEth;

			$('#acl-tabs').children().each(function ( index, value ) {
				if ( $(value).hasClass('active') ) { [showingEth, ] = value.id.split('-'); }
			});
			if ( showingEth === undefined ) { alert('Please add a interface tab before add a rule.'); return; }

			record.showing = parseInt(showingEth.split('eth')[1]);
			console.log(record);

			$addRuleModal.on('show.bs.modal', function () {
				$('#addrule-title').text(`Add Rule To Interface [ ${showingEth} ]`);
				$('#addrule-inout').val('INPUT');
				$('#addrule-srcip').val('0.0.0.0');
				$('#addrule-srcmask').val('0');
				$('#addrule-destip').val('0.0.0.0');
				$('#addrule-destmask').val('0');
				$('#addrule-protocol').val('tcp');
				$('#addrule-tcpflag').val('ANY');
				$('#addrule-action').val('ACCEPT');
			});

			$addRuleModal.on('shown.bs.modal', function () {});
			$addRuleModal.on('hide.bs.modal', function () {});
			$addRuleModal.on('hidden.bs.modal', function () { $addRuleModal.remove(); });

			$('#addrule-confirm').on('click', function () {
				console.log('addrule-confirm');

				createRuleEntry ( showingEth, {
					interface: showingEth,
					in_out: $('#addrule-inout').val(),
					src_ip: `${$('#addrule-srcip').val()}/${$('#addrule-srcmask').val()}`,
					dest_ip: `${$('#addrule-destip').val()}/${$('#addrule-destmask').val()}`,
					protocol: $('#addrule-protocol').val(),
					src_port: undefined,
					dest_port: undefined,
					tcp_flags: $('#addrule-tcpflag').val(),
					action: $('#addrule-action').val(),
				});
				rebindRuleButton();

				record.isModified = true;
				$addRuleModal.modal('hide');
			});
			// listOrder, interface, in_out, src_ip, dest_ip, protocol, src_port, dest_port, tcp_flags, action, isExchange=false

			$('#addrule-close').on('click', function () {
				console.log('addrule-close');
				$addRuleModal.modal('hide');
			});
			
			$addRuleModal.modal('show');
		});

		$importButton.on('click', function () {
			console.log('import acl');
			dialog.showOpenDialog( function ( filepath ) {
				// filepath is an array that contains all the selected
				// console.log(filepath);
				if ( filepath === undefined ) {
					console.log("No file selected");
					return;
				}
				newACLObj = new ACLObject(nodeSelected.key, fs.readFileSync(filepath[0], 'utf-8').toString().split('\n'));
				record.isModified = true;
				createACLTable();
			});
		});

		$exportButton.on('click', function () {
			console.log('export acl');
			dialog.showSaveDialog( function ( filepath ) {
				if ( filepath === undefined ) {
					console.log("You didn't save the file");
					return;
				}
				let cmdList = [];
				newACLObj = constructACLObject();

				newACLObj.ruleList.forEach(function ( data, dataCount ) {
					let cmd = ['iptables -A'];

					if ( _.isEqual(data.in_out, 'INPUT') ) {
						cmd.push(`${data.in_out} -i ${data.interface}`);
					} else if ( _.isEqual(data.in_out, 'OUTPUT') ) {
						cmd.push(`${data.in_out} -o ${data.interface}`);
					}

					if ( data.protocol )
						cmd.push(`-p ${data.protocol}`);

					if ( data.src_ip )
						cmd.push(`-s ${data.src_ip}`);
					if ( data.dest_ip )
						cmd.push(`-d ${data.dest_ip}`);

					if ( data.src_port )
						cmd.push(`--sport ${data.src_port}`);
					if ( data.dest_port )
						cmd.push(`--dport ${data.dest_port}`);

					if ( data.tcp_flags.length !== 0 ) {
						cmd.push(`--tcp-flags SYN,ACK,FIN,RST ${data.tcp_flags.join(',')}`);
					}
					cmd.push(`-j ${data.action}`);
					cmdList.push(cmd.join(' '));
				});
				// iptables -A INPUT -i eth0 -s 192.168.100.0/24 -d 192.168.101.0/32 --tcp-flags SYN,ACK,FIN,RST SYN -j ACCEPT
				
				// filepath is a string that contains the path and filename created in the save file dialog.
				fs.writeFile(filepath, cmdList.join('\n'), function ( err ) {
					if ( err ){
						alert("An error ocurred creating the file "+ err.message)
					}
					alert("The file has been succesfully saved");				
				});
			});
		});

		$confirmButton.on('click', function () {
			console.log('confirm')
			if ( record.isModified ) {
				// console.log('renew obj');
				curThesisObj['aclObject'][nodeSelected.key] = constructACLObject();
				console.log(curThesisObj['aclObject'][nodeSelected.key]);
			}

			$modal.modal('hide');
		});


		$modal.modal('show');

		function createACLTable () {
			$('#acl-tabs').empty();
			$('#acl-table').empty();

			$(`<li id="add-tab"><a id="modal-addtab-button" type="button" aria-expanded="true">
			<i class="ace-icon fa fa-plus"></i></a></li>`).appendTo('#acl-tabs');
			console.log("addtxb ");
			console.log("record",record);
			$('#add-tab').on('click', function () {
				console.log('add tab');
				let eth,io;

				for (let i=0; i<16; i++) {
					if ( !record.exist.hasOwnProperty(`eth${i}`) ) {
						eth = i;
						record.exist[`eth${eth}`] = true;
						break;
					}
				}
			console.log("eth",eth);
				
				record.showing = eth;
				createTabContent(`eth${eth}`);
				record.isModified = true;
				console.log("record.showing",record.showing);
				if ( eth === record.showing ) { 
					$('#acl-tabs li').removeClass('active');
					$('#acl-table div').removeClass('active');

					$(`#eth${eth}-tab`).addClass('active');
					$(`#eth${eth}`).addClass('active');
				}
			});


			if ( checkObjectIsEmpty(newACLObj['ruleObject']) ) {
				console.log('ruleObject empty');
			} else {
				Object.keys(newACLObj['ruleObject']).sort().forEach(function ( eth, ethCount ) {
					if ( !record.exist.hasOwnProperty(eth) ) { record.exist[eth] = true; }
					createTabContent(eth);
					Object.keys(newACLObj['ruleObject'][eth]).sort().forEach(function ( io, ioCount ) {
						newACLObj['ruleObject'][eth][io].forEach(function ( rule, ruleCount ) {
							// if ( rule === undefined ) { return; }
							createRuleEntry(eth, rule);
						});
					});
				});

				$('#acl-tabs li').removeClass('active');
				$('#acl-table div').removeClass('active');

				record.showing = 0;
				$(`#eth${record.showing}-tab`).addClass('active');
				$(`#eth${record.showing}`).addClass('active');
			}
			rebindRuleButton();

			$('.scrollable').each(function () { var $this = $(this); $(this).ace_scroll({ size: $this.attr('data-size') || 425, }); });
		}

		function createTabContent ( tabName ) {
			let $tab = `<li id="${tabName}-tab"><a data-toggle="tab" href="#${tabName}" aria-expanded="true">${tabName}
			<i id="remove-${tabName}" type="button" class="ace-icon" style="font-size: 0.65em"><span class="fa-stack">
			<i class="fa fa-square fa-stack-2x"></i><i class="fa fa-times fa-inverse fa-stack-2x"></i></span></i></a></li>`;

			let $table = `<div id="${tabName}" class="tab-pane"><div class="scrollable">
			<table class="table table-bordered table-hover"><thead><tr><th>Order</th><th></th>
			<th>In/Out</th><th>Protocol</th><th>Src IP</th><th>Dest IP</th><th>Flag</th>
			<th>Action</th></tr></thead><tbody></tbody></table></div></div>`;

			$($tab).insertBefore('#add-tab');
			$($table).appendTo('#acl-table');


			$(`#remove-${tabName}`).on('click', function () {
				console.log('remove tab');

				delete record.exist[tabName];
				record.isModified = true;

				for (let i=0; i<16; i++) {
					if ( record.exist.hasOwnProperty(`eth${i}`) ) {
						record.showing = i;
						break;
					}
				}
				$('#acl-tabs li').removeClass('active');
				$('#acl-table div').removeClass('active');

				$(`#eth${record.showing}-tab`).addClass('active');
				$(`#eth${record.showing}`).addClass('active');
				
				$(`#${tabName}`).remove();
				$(`#${tabName}-tab`).remove();
			});
		}

		function createRuleEntry ( eth, rule ) {
			// console.log(rule);
			let tcp_flags;
			if ( rule.tcp_flags.constructor === Array ) {
				if ( rule.tcp_flags.length === 0 ) {
					tcp_flags = 'ANY';
				} else if ( rule.tcp_flags.length === 1 ) {
					tcp_flags = rule.tcp_flags[0];
				} else if ( rule.tcp_flags.length > 1 ) {
					if ( rule.tcp_flags[0] === 'ACK' ) {
						tcp_flags = `${rule.tcp_flags[1]}+${rule.tcp_flags[0]}`;
					} else if ( rule.tcp_flags[1] === 'ACK' ) {
						tcp_flags = `${rule.tcp_flags[0]}+${rule.tcp_flags[1]}`;
					}
				}
			} else {
				tcp_flags = rule.tcp_flags;
			}

			let $tbody = $(`#${eth}`).find('tbody');

			let tr = `<tr></tr>`;
			let td_button = `<td>${ruleButtons}</td>`;
			let td_ruleorder = `<td>${rule.ruleOrder}</td>`;
			let td_in_out = `<td>${rule.in_out}</td>`;
			let td_protocol = `<td>${rule.protocol}</td>`;
			let td_srcip = `<td>${rule.src_ip}</td>`;
			let td_destip = `<td>${rule.dest_ip}</td>`;
			let td_flag = `<td>${tcp_flags}</td>`;
			let td_action = `<td>${rule.action}</td>`;
			// $(tr).append(td_ruleorder).appendTo($tbody);
			$(tr).append(td_ruleorder,td_button, td_in_out, td_protocol, td_srcip, td_destip, td_flag, td_action).appendTo($tbody);
		}

		function rebindRuleButton () {
			
			$('a#rule-upper').each(function () {
				$(this).off("click");

				$(this).on('click', function () {
					console.log('upper');

					let preItem = $(this.parentNode.parentNode).prev()[0];
					if ( preItem === undefined ) { alert(`Can not upper rule`); return; }
					let curItem = $(this.parentNode.parentNode)[0];
					record.isModified = true;
					$(preItem).insertAfter(curItem);
				});
			});

			$('a#rule-lower').each(function () {
				$(this).off("click");

				$(this).on('click', function () {
					console.log('lower');

					let nextItem = $(this.parentNode.parentNode).next()[0];
					if ( nextItem === undefined ) { alert(`Can not lower rule`); return; }
					let curItem = $(this.parentNode.parentNode)[0];
					record.isModified = true;
					$(nextItem).insertBefore(curItem);
				});
			});

			$('a#rule-modify').each(function () {
				$(this).off("click");

				$(this).on('click', function () {
					console.log('modify');
					let curItem = $(this.parentNode.parentNode)[0];

					let modRuleData = $(this.parentNode.parentNode).children();
					let modRule = {
						in_out: modRuleData[1].textContent,
						protocol: modRuleData[2].textContent,
						src_ip: modRuleData[3].textContent,
						dest_ip: modRuleData[4].textContent,
						tcp_flags: modRuleData[5].textContent,
						action: modRuleData[6].textContent,
					};

					$(addRuleModalHtml).addClass('aside').ace_aside({container: '#firewall-doubleclick-modal > .modal-dialog'});
					let $modRuleModal = $('#addrule-modal');
					let showingEth;

					$('#acl-tabs').children().each(function ( index, value ) {
						if ( $(value).hasClass('active') ) { [showingEth, ] = value.id.split('-'); }
					});

					record.showing = parseInt(showingEth.split('eth')[1]);
					console.log(record.showing);

					$modRuleModal.on('show.bs.modal', function () {
						$('#addrule-title').text(`Modify Rule In Interface [ ${showingEth} ]`);
						$('#addrule-inout').val(modRule.in_out);
						$('#addrule-srcip').val(modRule.src_ip.split('/')[0]);
						$('#addrule-srcmask').val(modRule.src_ip.split('/')[1]);
						$('#addrule-destip').val(modRule.dest_ip.split('/')[0]);
						$('#addrule-destmask').val(modRule.dest_ip.split('/')[1]);
						$('#addrule-protocol').val(modRule.protocol);
						$('#addrule-tcpflag').val(modRule.tcp_flags);
						$('#addrule-action').val(modRule.action);
					});

					$modRuleModal.on('shown.bs.modal', function () {});
					$modRuleModal.on('hide.bs.modal', function () {});
					$modRuleModal.on('hidden.bs.modal', function () { $modRuleModal.remove(); });

					$('#addrule-confirm').on('click', function () {
						console.log('modify-confirm');

						let newRule = {
							in_out: $('#addrule-inout').val(),
							protocol: $('#addrule-protocol').val(),
							src_ip: `${$('#addrule-srcip').val()}/${$('#addrule-srcmask').val()}`,
							dest_ip: `${$('#addrule-destip').val()}/${$('#addrule-destmask').val()}`,
							tcp_flags: $('#addrule-tcpflag').val(),
							action: $('#addrule-action').val(),
						};
						console.log(newRule);

						if ( _.isEqual(newRule, modRule) ) {
							console.log('no modify');
						} else {
							console.log('has modify');
							modRuleData[1].textContent = newRule.in_out;
							modRuleData[2].textContent = newRule.protocol;
							modRuleData[3].textContent = newRule.src_ip;
							modRuleData[4].textContent = newRule.dest_ip;
							modRuleData[5].textContent = newRule.tcp_flags;
							modRuleData[6].textContent = newRule.action;
							record.isModified = true;
						}

						$modRuleModal.modal('hide');
					});
					// // listOrder, interface, in_out, src_ip, dest_ip, protocol, src_port, dest_port, tcp_flags, action, isExchange=false

					$('#addrule-close').on('click', function () {
						console.log('addrule-close');
						$modRuleModal.modal('hide');
					});
					
					$modRuleModal.modal('show');
				});
			});

			$('a#rule-remove').each(function () {
				$(this).off("click");

				$(this).on('click', function () {
					console.log('remove');

					let curItem = $(this.parentNode.parentNode)[0];
					record.isModified = true;
					$(curItem).remove();
				});
			});
		}

		function constructACLObject () {
			let newAclObject = new ACLObject($('#modal-title').text());
			console.log(newACLObj);
			let listOrder = 0;
			$('#acl-table').children().each(function ( tableIndex, table ) {
				// console.log(tableIndex, table);
				newAclObject['ruleObject'][table.id] = newAclObject['ruleObject'][table.id] || {};
				$(table).find('tbody').children().each(function ( dataIndex, data ) {
					let ruleData = $(data).children();
					console.log("ruledata",ruleData);
					let in_out = ruleData[2].textContent;
					let protocol = ruleData[3].textContent;
					let src_ip = ruleData[4].textContent;
					let dest_ip = ruleData[5].textContent;
					let tcp_flags = ruleData[6].textContent;
					let action = ruleData[7].textContent;
					let src_port, dest_port;

					if ( tcp_flags === 'ANY' ) {
						tcp_flags = []
					} else {
						tcp_flags = tcp_flags.split('+');
					}

					let newRule = new ACLObject.RuleObject(listOrder, table.id, in_out, src_ip, dest_ip, protocol, src_port, dest_port, tcp_flags, action);
					newAclObject['ruleObject'][table.id][newRule.in_out] = newAclObject['ruleObject'][table.id][newRule.in_out] || [];
					newRule['nodeName'] = newAclObject['nodeName'];
					newRule['ruleOrder'] = newAclObject['ruleObject'][table.id][newRule.in_out].length;
					newAclObject['ruleObject'][table.id][newRule.in_out].push(newRule);
					newAclObject['ruleList'].push(newRule);

					listOrder++;
				});
			});

			return newAclObject;

			// $($('#acl-table').children()).find('tbody').children()
		}
	}

	// function depictOptResult (dataList,record_showing,in_out) {
	// 	if ( $('#optpage-body').hasClass('hidden') ) $('#optpage-body').removeClass('hidden');
	// 	$('#optchart-tabs').empty();
	// 	$('#opttab-content').empty();
	// 	let showingNodeCount = 0;
	// 	console.log(dataList);
		
	// 	// let newACLObj = curThesisObj['aclObject'][nodeSelected.key];

	// 	let newAclObject = new ACLObject($('#modal-title').text());
	// 	// console.log( util.inspect(curThesisObj['aclObject']., { showHidden: false, depth: null }) ); 
	// 	Object.keys(dataList).forEach(function ( nodeName, nodeNameCount ) {
	// 	// console.log( util.inspect(curThesisObj['aclObject'][nodeName], { showHidden: false, depth: null }) ); 
	// 		// if ( !curThesisObj['aclObject'][nodeName].hasOwnProperty('ARARTree') ) {
	// 		// 	showingNodeCount++;
	// 		// 	return;
	// 		// }
	// 		console.log(newAclObject.nodeName);
	// 		let curNode = dataList[nodeName]['ruleObject'][record_showing];
	// 		let chartID = `optchart-${newAclObject.nodeName}`;
	// 		console.log(chartID);
	// 		let $tab = `<li id="optli-${newAclObject.nodeName}"><a data-toggle="tab"  href="#opttab-${newAclObject.nodeName}">${newAclObject.nodeName}</a></li>`;
	// 		// let $chart = `<div id="tab-${nodeName}" class="tab-pane fade"><div id="${chartID}" style="height:400px"></div></div>`;
	// 		let $chart = `<div id="opttab-${newAclObject.nodeName}" class="tab-pane fade " >
	// 					<div class="row"> <div class="col-xs-12" > <div id="${chartID}" style="height:400px "></div> </div> </div>
	// 					<div class="row"> <div class="col-xs-12" ></div> </div>
	// 					</div>`;
	// 		$($tab).appendTo('#optchart-tabs');
	// 		$($chart).appendTo('#opttab-content');

	// 		if ( nodeNameCount === showingNodeCount ) {
	// 		$(`#opttab-${newAclObject.nodeName}`).addClass('in active');
	// 		$(`#optli-${newAclObject.nodeName}`).addClass('active');
	// 	}//沒有這個畫不出來
	// 		console.log("chartID",chartID);
	// 		// console.log("before chart");
	// 		// console.log(`in depictOptResult nodeName:${nodeName}`);
	// 		createHighcharts(chartID, curNode[in_out],record_showing,newAclObject.nodeName);
	// 		// console.log("after chart");
	// 	});
	// 	// $( "#tabs" ).tabs();

	// 	function createHighcharts ( chartID, dataList,record_showing,nodeName ) {
	// 		// console.log("chart work");
	// 		let chart = {
	// 			chart: { type: 'arearange', zoomType: 'xy'},
	// 			title: { text: null },
	// 			tooltip: { 
	// 				followPointer: true,
	// 				useHTML: true,
	// 				headerFormat: `<div class="center" style="font-size: 14px; font-weight: bold">{series.name}</div></hr><div><table>`,
	// 				footerFromat: '</table></div>',
	// 				pointFormatter: function () {
	// 					var str =	`<tr><td>Src:&#200;</td>\
	// 									<td>${ipConvertor(this.series.xData[0])}</td>\
	// 									<td>&#200;~&#200;</td>\
	// 									<td>${ipConvertor(this.series.xData[1])}</td>\
	// 								</tr>\
	// 								<tr>\
	// 									<td>Dest:&#160;</td>\
	// 									<td>${ipConvertor(this.low)}</td>\
	// 									<td>&#160;~&#160;</td>\
	// 									<td>${ipConvertor(this.high)}</td>\
	// 								</tr>`;
						
	// 					return str;
	// 				},
	// 			},
				
	// 			xAxis: {
	// 				text: 'Source IP Address',
	// 				title: "Source Address",
	// 				labels: { formatter: function () { return ipConvertor(this.value); } },
	// 				floor: 0,
	// 				ceiling: 4294967295,

	// 			},

	// 			yAxis: {
	// 				text: 'Destination IP Address',
	// 				title: "Destination Address",
	// 				labels: { formatter: function () { return ipConvertor(this.value); } },
	// 				floor: 0,
	// 				ceiling: 4294967295,
	// 			}
	// 		};
	// 		// console.log(record_showing);
	// 		// console.log(dataList);
	// 		// console.log(`in createHighcharts nodeName:${nodeName}`);
	// 		chart.series = createSeries(dataList,nodeName);
	// 		console.log(chart.series);
	// 		console.log("chartID",chartID);
	// 				console.log("chart",chart);
	// 		Highcharts.chart(chartID, chart);
			

			
	// 	}
		
	// 	function createSeries ( ruleList,nodeName ) {
	// 		// console.log(`in createSeries nodeName:${nodeName}`);
	// 		let seriesList = [];
	// 		// let ruleList=[];
	// 		// console.log( util.inspect(ruleList, { showHidden: false, depth: null }) );
	// 		// for (var i = 0; i < dataList.length; i++) {
	// 		// 	ruleList.push(dataList[i]);
	// 		// }
	// 		console.log("before ipConvertor",ruleList);
	// 		ruleList = inputDataConvertor(ruleList);
	// 		console.log("after convertor",ruleList);
			
	// 		ruleList.forEach(function ( data, dataCount ) {
	// 			// console.log(data);
	// 			let SourceLength,DestinationLength,series;
	// 			SourceLength = (data.max_sip - data.min_sip)+1;
	// 			DestinationLength = (data.max_dip - data.min_dip)+1;
	// 			// console.log(SourceLength);
	// 			// console.log(DestinationLength);
	// 			var dataRange = [{ x: data.min_sip, low: data.min_dip, high: data.min_dip + DestinationLength }, { x: data.min_sip + SourceLength, low: data.min_dip, high: data.min_dip + DestinationLength }],
	//                 dataSource = { start: ipConvertor(data.min_sip), end: ipConvertor(data.max_sip) },
	//                 dataDestination = { start: ipConvertor(data.max_dip), end: ipConvertor(data.min_dip) };
 //           		// console.log(ipConvertor(data.min_sip));           		
 //           		// console.log(dataSource);           		
 //           		// console.log(dataDestination);       
 //           		if(data.action=="ACCEPT")
 //           			var color_num=8;
 //           		else
 //           			color_num=2;    		
 //           		series = { name: `${data.eth},Rule ${data.ruleOrder} ${data.action}  ` ,
 //           		 followPointer: false, 
 //           		 enableMouseTracking: false,
 //           		 trackByArea: true ,
 //           		 showInLegend: true, 
 //           		 type: 'arearange', 
 //           		 lineWidth: 1.5, 
 //           		 color: Highcharts.setOptions().colors[dataCount],
 //           		 marker: { enabled: false, states: { hover: { enabled: false } } }, 
 //           		 fillOpacity: 0.3, 
 //           		 data: dataRange, 
 //           		 ruleOrder: data.ruleOrder, 
 //           		 source: dataSource, 
 //           		 destination: dataDestination,
 //           		  dataLabels: {
	// 			        enabled: true,    //默认是false，即默认不显示数值
	// 			        color: '#666',    //字体颜色
	// 			        align: 'right'   //居柱子中间
	// 			   },
	// 			   legend: {
	// 				    layout:'vertical',         //竖直显示，默认是水平显示的
	// 				    align: 'right',            //图例说明在区域的右边，默认在中间
	// 				    verticalAlign: 'middle',    //竖直方向居中，默认在底部
	// 				   shadow: true,
	// 				}
				  

 //           		  };
	// 			seriesList.push(series);
	// 		});
 //           		 // seriesList=seriesList.reverse();

			
	// 		return seriesList;
	// 	}

	// }//depictOptResult end
}//buildModal
		// function inputDataConvertor ( dataList ) {
		// 	let newDataList = [];
		// 	console.log(dataList);
		// 	for (let dataCount=0; dataCount<dataList.length; dataCount++) {
		// 		let data = dataList[dataCount];
		// 		let newData, src_ip, dest_ip, flag = false;
		// 		src_ip = new AddressPrefixObject(data['src_ip']);
		// 		dest_ip = new AddressPrefixObject(data['dest_ip']);
		// 		if ( data['tcp_flags'].length > 0 ) flag = true;
		// 		newData = new depictARARRule(data['interface'],data['in_out'],data['ruleOrder'],data['listOrder'], src_ip['ipMinNumber'], src_ip['ipMaxNumber'], dest_ip['ipMinNumber'], dest_ip['ipMaxNumber'], flag, data['isExchange'],data['action']);
		// 		newDataList.push(newData);
		// 	}
		// 	return newDataList;
		// }
		// function depictARARRule ( eth,inout,ruleOrder,listOrder, min_sip, max_sip, min_dip, max_dip, flag, isExchange,action ) {
		// 	this.eth=eth;
		// 	this.inout=inout;
		// 	this.ruleOrder=ruleOrder;
		// 	this.listOrder = listOrder;
		// 	this.min_sip = min_sip;
		// 	this.max_sip = max_sip;
		// 	this.min_dip = min_dip;
		// 	this.max_dip = max_dip;
		// 	this.flag = flag;
		// 	this.isExchange = isExchange;
		// 	this.action = action;
		// }
