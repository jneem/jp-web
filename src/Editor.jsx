import Button from '@material-ui/core/Button';
import Column from './Column.jsx';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import React from 'react';
import TextField from '@material-ui/core/TextField';

export default class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      text: props.text,
	  disabled: false,
    };
  }

  componentWillReceiveProps(nextProps){
	const { text } = nextProps;
	console.log(text);
	if (typeof text === "undefined") {
	  this.setState({ text: '', disabled: true });
	} else if (text != this.state.text) {
      this.setState({ text: text, disabled: false });
    }
  }

  render() {
    const {
      onCommit,
      onRevert,
      dirty,
    } = this.props;

    return (
      <Column>
        <Column main>
          <Paper style={{height: "100%"}}>
            <textarea
              style={{width: "100%", height: "100%", resize: "none", border: 0}}
              disabled={this.state.disabled}
              value={this.state.disabled ? "Digle is not ordered! Hint: delete a node by double-clicking it, or add an edge by dragging from one node to another." : this.state.text}
              onChange={e => this.setState({ text: e.target.value })}
            />
          </Paper>
        </Column>
        <Column item>
          <Grid container>
            <Grid item xs={6}>
              <Button
                variant="contained"
                color="secondary"
                fullWidth={true}
                disabled={this.state.disabled || this.state.text == this.props.text}
                onClick={e => onRevert()}
              >
                Revert
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="contained"
                color="primary"
                fullWidth={true}
                disabled={this.state.disabled || this.state.text == this.props.text}
                onClick={e => onCommit(this.state.text)}
              >
                Commit
              </Button>
            </Grid>
          </Grid>
        </Column>
      </Column>
    );
  }
}

