import React from 'react'
import F from 'flyd'

import {game_model, CellStatusT, CellContentT, GameStatusT, click_restart, click_cell} from '../model'

export default class App extends React.Component {

  componentWillMount() { // boilerplate
    F.on(s => this.setState(s), game_model)
  }

  _render_cell(status, row_index_x) {
    return (cell, column_index_x) => {

      const new_cell_status = GameStatusT.case({
        Playing: () => cell.status,
        Lost: () => CellStatusT.Open(),
        StartingGame: () => CellStatusT.Closed(),
      }, status)

      const [cell_class, cell_contents ] = CellStatusT.case({
        Open: () => CellContentT.case({
          Mine: () => ['bomb', '!'],
          Neighbors: n => n==0 ? ['open', ''] : ['open', n],
          _: () => ['', ''],
        }, cell.content),
        Closed: () => ['',''],
      }, new_cell_status)

      return <td className={cell_class} onClick={click_cell(column_index_x, row_index_x)}>{cell_contents}</td>
    }
  }

  _render_row(status) {
    return (row, row_index_y) =>
      <tr>{row.map(this._render_cell(status, row_index_y))}</tr>
  }

  render() {
    const button_message = GameStatusT.case({
      Playing: () => 'Restart game',
      Lost: () => 'You lost! Click here to restart game',
      StartingGame: () => 'Click on a cell to begin'
    }, this.state.status)

    return <div className="container">
      <p className="title">Minesweeper</p>
      <button onClick={click_restart}>{button_message}</button>
      <table>
        { this.state.board.map(this._render_row(this.state.status)) }
      </table>
    </div>
  }

}
