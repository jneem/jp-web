import * as wasm from 'jp_wasm';
import AppBar from '@material-ui/core/AppBar';
import Button from '@material-ui/core/Button';
import Column from './Column.jsx';
import Divider from '@material-ui/core/Divider';
import Editor from './Editor.jsx';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import ReactDOM from 'react-dom';
import Tab from '@material-ui/core/Tab';
import Tabs from '@material-ui/core/Tabs';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames';

const vis = window.vis;

const column = {
  height: "100%",
};

const NODE_COLOR = 'lightblue';
const NODE_DELETED_COLOR = 'lightgray';
const NODE_HOVER_COLOR = 'orange';

const options = {
  edges: {
    arrows: 'to',
  },
  nodes: {
	shape: 'box',
  },
  interaction: {
    hover: true,
    dragNodes: false,
    dragView: false,
    //selectable: false,
  },
  layout: {
	randomSeed: 2,
  },
  physics: {
    barnesHut: {
      centralGravity: 0.6,
    },
    maxVelocity: 10,
  }
};

export class App extends React.Component {

  constructor(props) {
    super(props);
    this.repo = new wasm.Repo;
    
    // These are the nodes and edges that belong to the various graphs that we
    // display. The way vis.js works, when we modify these datasets the changes
    // will automatically appear in the graphs. In particular, they bypass the
    // usual react state mechanisms, and so we don't store them in this.state.
    this.patchNodes = new vis.DataSet({});
	this.patchEdges = new vis.DataSet({});
	this.digleNodes = new vis.DataSet({});
	this.digleEdges = new vis.DataSet({});


    this.digleContainer = React.createRef();
    this.patchContainer = React.createRef();
    this.dragStartNode = null;

    this.state = {
	  text: '',

      // These are all changes that have been made to the digle view but
      // not committed.
      digleDeletedNodes: [], // Array of node ids.
      digleAddedEdges: [], // Array of (node id, node id) pairs.
    };
  }

  componentDidMount() {
    this.digleNetwork = new vis.Network(
	  this.digleContainer.current,
	  { nodes: this.digleNodes, edges: this.digleEdges },
	  options
	);
    this.digleNetwork.on("hoverNode", node => this.onDigleHover(node));
    this.digleNetwork.on("blurNode", node => this.onDigleBlur(node));
    this.digleNetwork.on("doubleClick", node => this.onDigleDoubleClick(node));
    this.digleNetwork.on("dragStart", ev => this.onDigleDragStart(ev));
    this.digleNetwork.on("dragEnd", ev => this.onDigleDragEnd(ev));

    this.patchNetwork = new vis.Network(
	  this.patchContainer.current,
	  { nodes: this.patchNodes, edges: this.patchEdges },
	  options
	);
    this.patchNetwork.on("hoverNode", node => this.onPatchHover(node));
    this.patchNetwork.on("blurNode", node => this.onPatchBlur(node));
    this.patchNetwork.on("doubleClick", node => this.onPatchDoubleClick(node));
  }

  updateText(text) {
    this.repo.commit(text);
	this.updateDigleGraph();
	this.updatePatchGraph();
    this.setState({
	  text: text,
	});
  }

  getPatchForDigleNode(node) {
    // The node takes the format <PATCH_ID>/<N>, so to get the patch id we take
    // everything up to the '/'.
    const i = node.indexOf('/');
	const patch_id = node.slice(0, i);
    return this.patchNodes.get(patch_id)
  }

  getDigleNodesForPatch(patch_id) {
    return this.digleNodes.get({filter: x => x.id.startsWith(patch_id)})
  }

  onDigleHover(ev) {
    const patch_node = this.getPatchForDigleNode(ev.node)
    this.patchNodes.update(Object.assign(patch_node, {color: NODE_HOVER_COLOR}));
  }

  onDigleBlur(ev) {
    const patch_node = this.getPatchForDigleNode(ev.node)
    this.patchNodes.update(Object.assign(patch_node, {color: NODE_COLOR}));
  }

  onDigleDoubleClick(ev) {
    if (ev.nodes.length == 0) {
      return;
    }

    const id = ev.nodes[0];
    const old_node = this.digleNodes.get(id);
    if (old_node.live) {
      this.setState({digleDeletedNodes: [...this.state.digleDeletedNodes, id]});
      this.digleNodes.update(Object.assign(old_node, {live: false, color: NODE_DELETED_COLOR}));
    } else {
      console.log("Not deleting node ", id);
    }
  }

  onDigleRevert() {
    for (const id of this.state.digleDeletedNodes) {
      const old_node = this.digleNodes.get(id);
      this.digleNodes.update(Object.assign(old_node, {live: true, color: NODE_COLOR}));
    }
    for (const id of this.state.digleAddedEdges) {
      this.digleEdges.remove(id);
    }
    this.setState({digleDeletedNodes: [], digleAddedEdges: []});
  }

  onDigleCommit() {
    console.log(this.state.digleDeletedNodes, this.state.digleAddedEdges);
    const changes = new wasm.Changes(this.state.digleDeletedNodes, this.state.digleAddedEdges);
    this.repo.apply_changes(changes);
	this.updateDigleGraph();
	this.updatePatchGraph();
    this.updateEditor();
  }

  onDigleDragStart(ev) {
    this.dragStartNode = this.digleNetwork.getNodeAt(ev.pointer.DOM);
    console.log(ev, this.dragStartNode);
  }

  onDigleDragEnd(ev) {
    console.log(ev);
    const dest = this.digleNetwork.getNodeAt(ev.pointer.DOM);
    const src = this.dragStartNode;
    if (src && dest) {
      const edge_id = src + dest;
      if (!this.digleEdges.get(edge_id)) {
        this.digleEdges.add({id: edge_id, from: src, to: dest});
        this.setState({digleAddedEdges: [...this.state.digleAddedEdges, [src, dest]]});
        console.log("added edge");
      } else {
        console.log("edge already exists");
      }
    }
  }

  onPatchHover(ev) {
    const digle_nodes = this
      .getDigleNodesForPatch(ev.node)
      .map(x => Object.assign(x, {color: NODE_HOVER_COLOR}));
    this.digleNodes.update(digle_nodes);
  }

  onPatchBlur(ev) {
    const digle_nodes = this
      .getDigleNodesForPatch(ev.node)
      .map(x => Object.assign(x, {color: x.live? NODE_COLOR : NODE_DELETED_COLOR}));
    this.digleNodes.update(digle_nodes);
  }

  onPatchDoubleClick(ev) {
    if (ev.nodes.length == 0) {
      return;
    }

    const patch_id = ev.nodes[0]; // FIXME: what if this is empty?
    if (this.patchNodes.get(patch_id).live) {
      this.repo.unapply_patch(patch_id);
    } else {
      this.repo.apply_patch(patch_id);
    }
    this.updateEditor();
	this.updateDigleGraph();
	this.updatePatchGraph();
  }

  // Replace the data_set with the values in new_values, but do so without
  // deleting and re-adding things (since that causes the graphs the reposition
  // nodes).
  updateDataSet(dataset, new_values) {
    const new_ids = new Set(new_values.map(x => x.id));
    const obsolete_ids = dataset.map(x => x.id, {filter: x => !new_ids.has(x.id)});

    dataset.remove(obsolete_ids);
    dataset.update(new_values);
  }

  updatePatchGraph() {
    const patches = this.repo.patches();
	const ids = patches.patches();
    const nodes = ids.map(p => {
      return {
        id: p.id,
        label: p.id.slice(0, 4),
        live: p.applied,
        color: p.applied ? NODE_COLOR : NODE_DELETED_COLOR,
      }
    });
    const edges = patches.deps().map(x => {
      return { id: nodes[x[1]].id + nodes[x[0]].id, from: nodes[x[1]].id, to: nodes[x[0]].id }
    });

    this.updateDataSet(this.patchNodes, nodes);
    this.updateDataSet(this.patchEdges, edges);
  }

  updateDigleGraph() {
	const digle = this.repo.digle();
	const digle_nodes = digle.nodes();
	const nodes = digle.nodes().map(node => {
	  return {
        id: node.id,
        label: node.text.replace('\n', '\\n'),
        live: node.live,
        color: node.live? NODE_COLOR : NODE_DELETED_COLOR,
      };
	});
	const edges = digle.edges().map(x => {
	  return {
        id: digle_nodes[x.from].id + digle_nodes[x.to].id,
        from: digle_nodes[x.from].id,
        to: digle_nodes[x.to].id
      };
	});

    this.updateDataSet(this.digleNodes, nodes);
    this.updateDataSet(this.digleEdges, edges);

    // Forget any modifications that we have done to the graph.
    this.setState({digleDeletedNodes: []});
    this.setState({digleAddedEdges: []});
  }

  updateEditor() {
    this.setState({text: this.repo.file()});
  }

  render() {
	const { text } = this.state;

    return (
      <Grid container
        direction="row"
        justify="center"
        spacing={16}
      >
        <Grid item xs={6} sm={6} md={4} lg={4} xl={4} style={{height: "600px"}}>
          <Column>
            <Column item><Typography variant="h5">Editor</Typography></Column>
            <Column main>
              <Editor
                style={{height: "100%"}}
                text={text}
                onCommit={text => this.updateText(text)}
                onRevert={() => this.forceUpdate()}
              />
            </Column>
          </Column>
        </Grid>

        <Grid item xs={6} sm={6} md={4} lg={4} xl={4} style={{height: "600px"}}>
          <Column>
            <Column item><Typography variant="h5">Digle view</Typography></Column>
            <Column main>
              <Paper style={column}>
                <div style={{height: "95%"}} ref={this.digleContainer} />
              </Paper>
            </Column>
            <Column item>
              <Grid container>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    color="secondary"
                    disabled={this.state.digleDeletedNodes.length == 0 && this.state.digleAddedEdges.length == 0}
                    fullWidth={true}
                    onClick={() => this.onDigleRevert()}
                  >
                    Revert
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={this.state.digleDeletedNodes.length == 0 && this.state.digleAddedEdges.length == 0}
                    fullWidth={true}
                    onClick={() => this.onDigleCommit()}
                  >
                    Commit
                  </Button>
                </Grid>
              </Grid>
            </Column>
          </Column>
		</Grid>
        <Grid item xs={6} sm={6} md={4} lg={4} xl={4} style={{height: "600px"}}>
          <Column>
            <Column item><Typography variant="h5">Patches</Typography></Column>
            <Column main>
              <Paper style={column}>
                <div style={{height: "95%"}} ref={this.patchContainer} />
              </Paper>
            </Column>
          </Column>
        </Grid>
      </Grid>
    );
  }
}

ReactDOM.render(
    <App />,
    document.getElementById('hello')
);
