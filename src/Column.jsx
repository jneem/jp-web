import { withStyles } from '@material-ui/core/styles';
import React from 'react';

const styles = theme => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  item: {
  },
  main: {
    flexGrow: 1,
  },
});

function Column(props) {
  const { classes } = props;

  const className = props.main ? classes.main : (props.item ? classes.item : classes.container);
  return (
    <div className={className}>
      {props.children}
    </div>
  );
}

export default withStyles(styles)(Column);
