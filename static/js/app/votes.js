define(function() {

  function createSvgEl(node) {
    return document.createElementNS("http://www.w3.org/2000/svg", node);
  }
  function append(parent, child) {
    parent.appendChild(child);
  }

  function setAttr(el, attr, val) {
    if (typeof attr !== 'object') {
      var name = attr;
      attr = {};
      attr[name] = val;
    }
    for (var i in attr) {
      if (attr.hasOwnProperty(i)) {
        el.setAttribute(i, attr[i]);
      }
    }
  }

  /**
   * returned function should be called for initialize DOM elements, variables
   */
  return function (id, size) {
    var arrows = [],
      el = document.getElementById(id),
      svgElem = createSvgEl("svg"),
      defs = createSvgEl("defs"),
      marker = createSvgEl("marker"),
      markerGreen = createSvgEl("marker"),
      mpath = createSvgEl("path"),
      mpathGreen = createSvgEl("path"),

      sizeSquare = (size / 8),
      sizeSquareHalf = (size / 8 / 2),
      sizeShift = (size / 8 / 2 * 0.96),
      sizeShiftText = (size / 8 / 2 * 0.80),

      mpathAttr = {d: 'M 0 0 L 10 5 L 0 10 z'};

    setAttr(svgElem, {
      width: size,
      height: size
    });
    setAttr(mpath, mpathAttr);
    setAttr(mpathGreen, mpathAttr);

    setAttr(marker, {
      id: 'ArrowHead',
      viewBox: '0 0 10 10',
      refX: 0,
      refY: 5,
      markerUnits: 'strokeWidth',
      markerWidth: 4,
      markerHeight: 3,
      orient: 'auto',
      fill: 'gray'
    });
    setAttr(markerGreen, {
      id: 'ArrowHeadGreen',
      viewBox: '0 0 10 10',
      refX: 0,
      refY: 5,
      markerUnits: 'strokeWidth',
      markerWidth: 4,
      markerHeight: 3,
      orient: 'auto',
      fill: 'green'
    });

    append(svgElem, defs);
    append(markerGreen, mpathGreen);
    append(marker, mpath);
    append(defs, markerGreen);
    append(defs, marker);
    append(el, svgElem);

    /**
     * calc coordinates for arrow, return object with attributes for drawVote
     *
     * @param {String} vote  stringified object or just object with move data
     * @param {Number} weight number of votes for this move
     * @param {String} orientation - board orientation, accept 'white' or 'w'
     * @param {String} myVote user's vote 'Qf6'
     * @param {Number} totalVoters total number of players on this side of board (who can voting now)
     *
     * @returns {{x1: number, y1: number, x2: number, y2: number, stroke: number, mine: boolean, tX: number, tY: number, text: *}}
     */
    function calcVotePosition(san, vote, orientation, myVote, totalVoters) {
      if (typeof vote === 'string') {
        vote = JSON.parse(vote);
      }

      var x, y,
        fromX, fromY, toX, toY,
        fromCx, fromCy, toCx, toCy,
        fromSx, fromSy, toSx, toSy,
        xText, yText,
        from = [vote.xy.charCodeAt(0) - 97, 8 - vote.xy[1]],
        to = [vote.xy.charCodeAt(3) - 97, 8 - vote.xy[4]];



      // calc center of squares
      fromCx = from[0] * sizeSquare + sizeSquareHalf;
      fromCy = from[1] * sizeSquare + sizeSquareHalf;
      toCx = to[0] * sizeSquare + sizeSquareHalf;
      toCy = to[1] * sizeSquare + sizeSquareHalf;

      // calc shift from center to sides
      fromSx = (from[0] > to[0] ? -sizeShift : sizeShift);
      toSx = (from[0] < to[0] ? -sizeShift : sizeShift);
      fromSy = (from[1] > to[1] ? -sizeShift : sizeShift);
      toSy = (from[1] < to[1] ? -sizeShift : sizeShift);

      // correcting shift for vertical and horizontal moves, calc shift for text label
      if (from[0] === to[0]) { // vertical move, y in center
        fromSx = 0;
        toSx = 0;
        xText = toCx;
        yText = toCy + (from[1] > to[1] ? sizeShiftText : -sizeShiftText);
      } else if (from[1] === to[1]) { // horizontal move, x in center
        fromSy = 0;
        toSy = 0;
        xText = toCx + (from[0] > to[0] ? sizeShiftText : -sizeShiftText);
        yText = toCy;
      } else { //diagonal move
        xText = toCx + (from[0] > to[0] ? sizeShiftText : -sizeShiftText);
        yText = toCy + (from[1] > to[1] ? sizeShiftText : -sizeShiftText);

        // correcting shift for Knights
        if (san[0] === 'N') {
          if (Math.abs(from[0] - to[0]) === 1) {
            fromSx = (from[0] > to[0] ? -sizeShift/2 : sizeShift/2);
            toSx = (from[0] < to[0] ? -sizeShift/2 : sizeShift/2);
            xText = toCx + (from[0] > to[0] ? sizeShiftText / 2 : -sizeShiftText / 2);
          } else {
            fromSy = (from[1] > to[1] ? -sizeShift/2 : sizeShift/2);
            toSy = (from[1] < to[1] ? -sizeShift/2 : sizeShift/2);
            yText = toCy + (from[1] > to[1] ? sizeShiftText / 2 : -sizeShiftText / 2);
          }
        }
      }

      // sum center and shift coordinates
      fromX = fromCx + fromSx;
      fromY = fromCy + fromSy;
      toX = toCx + toSx;
      toY = toCy + toSy;

      // revert coordinates for black side
      if (orientation[0] === 'b') {
        fromX = size - fromX;
        fromY = size - fromY;
        toX = size - toX;
        toY = size - toY;
        xText = size - xText;
        yText = size - yText;
      }

      // calc weight of votes
      // TODO need smart calc
      var width = ~~vote.times / totalVoters * 4 + 1;

      return {
        x1: Math.round(fromX),
        y1: Math.round(fromY),
        x2: Math.round(toX),
        y2: Math.round(toY),
        stroke: width,
        mine: (myVote === san),
        tX: Math.round(xText),
        tY: Math.round(yText),
        text: vote.times
      };
    }

    /**
     * draw arrow for vote
     *
     * @param attr
     */
    function drawVote(attr) {
      var g = createSvgEl("g");
      var path = createSvgEl("path");
      var text = createSvgEl("text");
      setAttr(path, {
        d: 'M ' + attr.x1 + ' ' + attr.y1 + ' L ' + attr.x2 + ' ' + attr.y2,
        fill: 'none',
        stroke: attr.mine ? 'green' : 'gray',
        'stroke-width': (attr.stroke || 1),
        'marker-end': 'url(#ArrowHead' + (attr.mine ? 'Green' : '') + ')'
      });
      setAttr(text, {
        x: attr.tX,
        y: attr.tY,
        'text-anchor': 'middle',
        'alignment-baseline': 'middle',
        'font-size': 10,
        'fill': "black",
        'font-weight': 'bold'
      });
      append(text, document.createTextNode(attr.text));
      append(g, path);
      append(g, text);
      append(svgElem, g);
      arrows.push(g);
    }

    /**
     * function create arrows from votes
     * accept array of votes and draw each
     *
     * @param {Object} votes array of votes
     * @param {String} orientation - board orientation, accept 'white' or 'w'
     * @param {String} myVote user's vote 'Qf6'
     * @param {Number} totalVoters total number of players on this side of board (who can voting now)
     */

    return function (votes, orientation, myVote, totalVoters) {
      while (arrows.length) {
        svgElem.removeChild(arrows.pop());
      }
      for (var k in votes) {
        if (votes.hasOwnProperty(k)) {
          drawVote(calcVotePosition(k, votes[k], orientation, myVote, totalVoters));
        }
      }

    };
  };








});