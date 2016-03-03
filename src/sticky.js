import React from 'react';
import ReactDOM from 'react-dom';
import Watcher from './watcher';

export default class Sticky extends React.Component {

  static contextTypes = {
    container: React.PropTypes.any,
    offset: React.PropTypes.number
  }

  static defaultProps = {
    className: '',
    style: {},
    stickyClass: 'sticky',
    stickyStyle: {},
    topOffset: 0,
    onStickyStateChange: function () {}
  }

  static scrollWatcher = new Watcher(['scroll', 'touchstart', 'touchend']);
  static resizeWatcher = new Watcher(['resize']);

  constructor(props) {
    super(props);

    this.state = {
      height: 0
    };
  }

  componentDidMount() {
    this.updateOrigin();
    this.updateHeight();

    Sticky.resizeWatcher.on(this.onResize);
    Sticky.scrollWatcher.on(this.onScroll);
  }

  componentWillUnmount() {
    Sticky.resizeWatcher.off(this.onResize);
    Sticky.scrollWatcher.off(this.onScroll);
  }

  /*
   * Anytime new props are received, force re-evaluation
   */
  componentWillReceiveProps() {
    this.updateHeight();
  }

  pageOffset() {
    return window.pageYOffset || document.documentElement.scrollTop;
  }

  onScroll = () => {
    let shouldBeSticky = this.shouldBeSticky();

    let hasChanged = (this.state.isSticky !== shouldBeSticky);

    // Update this state
    this.setState({
      isSticky: shouldBeSticky,
      style: this.nextStyle(shouldBeSticky),
      className: this.nextClassName(shouldBeSticky)
    });

    // Publish sticky state change
    if (hasChanged) {
      let topCorrection = shouldBeSticky ? this.state.height : 0;
      this.context.container.updateTopCorrection(topCorrection);

      this.props.onStickyStateChange(shouldBeSticky);
    }
  }

  /*
   * Returns true/false depending on if this should be sticky.
   */
  shouldBeSticky() {
    let offset = this.pageOffset();
    let origin =  this.state.origin - (this.context.offset || 0);
    let containerNode = ReactDOM.findDOMNode(this.context.container);

    // check conditions
    let stickyTopConditionsMet = offset >= origin + this.props.topOffset;
    let stickyBottomConditionsMet = offset < containerNode.getBoundingClientRect().height + origin;
    return stickyTopConditionsMet && stickyBottomConditionsMet;
  }

  onResize = () => {
    this.updateOrigin();
    // emit a scroll event to re-calculate container top offsets
    Sticky.scrollWatcher.emit();
  }

  updateOrigin() {
    let node = React.findDOMNode(this);

    // Do some DOM manipulation to where this element's non-sticky position would be
    let previousPosition = node.style.position;
    node.style.position = '';
    let origin = node.getBoundingClientRect().top + this.pageOffset();
    node.style.position = previousPosition;

    this.setState({origin});
  }

  updateHeight() {
    let height = ReactDOM.findDOMNode(this).getBoundingClientRect().height;
    this.setState({ height });
  }

  /*
   * If sticky, merge this.props.stickyStyle with this.props.style.
   * If not, just return this.props.style.
   */
  nextStyle(shouldBeSticky) {
    if (shouldBeSticky) {
      let containerRect = ReactDOM.findDOMNode(this.context.container).getBoundingClientRect();

      // inherit the boundaries of the container
      let style = Object.assign({}, this.props.style);
      style.position = 'fixed';
      style.left = containerRect.left;
      style.width = containerRect.width;
      style.top = (this.context.offset || 0);

      let bottomLimit = containerRect.bottom - this.state.height;
      if (style.top > bottomLimit) style.top = bottomLimit;

      // Finally, override the best-fit style with any user props
      return Object.assign(style, this.props.stickyStyle);
    } else {
      return this.props.style;
    }
  }

  /*
   * If sticky, merge this.props.stickyClass with this.props.className.
   * If not, just return this.props.className.
   */
  nextClassName(shouldBeSticky) {
    var className = this.props.className;
    if (shouldBeSticky) {
      className += ' ' + this.props.stickyClass;
    }
    return className;
  }

  /*
   * The special sauce.
   */
  render() {
    return (
      <div style={this.state.style} className={this.state.className}>
        {this.props.children}
      </div>
    );
  }
}
