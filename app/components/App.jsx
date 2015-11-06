import React from 'react'
import F from 'flyd'
import T from '../union-type'
import R from 'ramda'

// parameters

const board_size = { width: 16, height: 16 }
const total_mines = 20

// model types

const CellStatusT = T({ Closed: [], Open: [] })

const CellContentT = T({
  Neighbors: [Number],
  Mine: [],
  Invalid: [],
  Unknown: []
})

const GameStatusT = T({ Playing: [], Lost: [], StartingGame: [] })

// cell is of type { status: CellStatusT, content: CellContentT }

const init_cell_state = { status: CellStatusT.Closed(), content: CellContentT.Unknown() }
const invalid_cell_state = { status: CellStatusT.Closed(), content: CellContentT.Invalid() }
const cell_with_a_mine = { status: CellStatusT.Closed(), content: CellContentT.Mine() }

const has_a_mine = (cell) => CellContentT.case({
  Mine: () => true,
  _: () => false
}, cell.content)

const is_open = (cell) => CellStatusT.case({
  Open: () => true,
  _: () => false
}, cell.status)

const is_invalid = (cell) => CellContentT.case({
  Invalid: () => true,
  _: () => false
}, cell.content)

// input stream

const UserClickT = T({ UserClick: [Number, Number], RestartGame: [] })

const input_stream = F.stream(UserClickT.RestartGame()) // values of type UserClickT

//F.on(x => console.log(x), input_stream)

const restart_button_click = () => input_stream(UserClickT.RestartGame())

const click_on_cell = (x, y) => () => input_stream(UserClickT.UserClick(x, y))

// model stream

// returns Array of Array of { status: CellStatusT, content: CellContentT }
const initialize_board = (size, mines, cell_state) =>
  R.repeat(R.repeat(cell_state, size.width), size.height)

const init_board_model = initialize_board(board_size, total_mines, init_cell_state)

const init_game_model = { board: init_board_model, status: GameStatusT.StartingGame() }

const have_mine = (board, x, y) => has_a_mine(R.view(cell_lens(x,y), board))

const reveal_all = (board) => board.map(row => row.map(cell => R.set(R.lensProp('status'), CellStatusT.Open(), cell)))

const p = (x,y) => ({ x, y })

const neighbors_of = (x, y) => [ p(x-1,y-1), p(x,y-1), p(x+1,y-1), p(x-1,y), p(x+1,y), p(x-1,y+1), p(x,y+1), p(x+1,y+1) ]

const cell_lens = (x,y) => (x >= 0 && x < board_size.width && y >= 0 && y < board_size.height)
  ? R.lens(board => board[y][x], (cell, board) => R.update(y, R.update(x, cell, board[y]), board))
  : R.lens(board => invalid_cell_state, (cell, board) => board)

const count_neighbor_mines = (board, x, y) => R.sum(neighbors_of(x,y).map( ({x,y}) => have_mine(board, x,y) ? 1 : 0))

const reveal_cell = (board, x, y) => {
  const reveal_rec = (brd, remaining) => {
    if (remaining.length == 0) return brd
    const {x, y} = R.head(remaining)
    const lens = cell_lens(x,y)
    const rest = R.tail(remaining)
    const cell = R.view(lens, brd)
    if (is_invalid(cell) || is_open(cell) || has_a_mine(cell)) return reveal_rec(brd, rest)
    const neighbors = count_neighbor_mines(brd, x, y)
    const new_cell = { content: CellContentT.Neighbors(neighbors), status: CellStatusT.Open() }
    const new_board = R.set(lens, new_cell, brd)
    if (neighbors == 0) return reveal_rec(new_board, R.concat(neighbors_of(x,y), rest))
    else return reveal_rec(new_board, rest)
  }
  return reveal_rec(board, [ {x, y} ])
}

const is_first_click = (model) => GameStatusT.case({
  StartingGame: () => true,
  _: () => false
}, model.status)

const make_new_model = (old_model, click) => UserClickT.case({
    UserClick: (x,y) => {
      const prepared_board = is_first_click(old_model) ? fill_random_board(board_size, total_mines) : old_model.board
      if (have_mine(prepared_board, x, y))
        return { board: reveal_all(prepared_board), status: GameStatusT.Lost() }
      else
        return { board: reveal_cell(prepared_board, x, y), status: GameStatusT.Playing() }
      },
        RestartGame: () => init_game_model
  }, click)

const fill_random_board = (size, mines) => {
  // some big primes to use as shift and factor: 2922509, 3276509, 94418953, 321534781, 433494437, 780291637
  const factor = 94418953
  const shift = Math.round(Math.random()*factor)
  const mines_indices = R.range(0, mines)
    .map(x => (x * factor + shift) % (size.width * size.height))
    .map(x => ({ x: x%size.width, y: (x-x%size.width)/size.height }))
  // x,y are guaranteed to be unique indices now, because math
  const filled_board = R.reduce(
    (board, {x,y}) => R.set(cell_lens(x,y), cell_with_a_mine, board),
    init_board_model,
    mines_indices
  )
  return filled_board
}

// game_model is a stream
const game_model = F.scan(make_new_model, init_game_model, input_stream)

//F.on(m => console.log(m), game_model)

export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = init_game_model
  }

  componentDidMount() { // boilerplate
    F.on(s => this.setState(s), game_model)
  }

  _render_cell(status, row_index_x) {
    return (cell, column_index_x) => {
      const new_cell_status = GameStatusT.case({
        Playing: () => cell.status,
        Lost: () => CellStatusT.Open(),
        StartingGame: () => CellStatusT.Closed(),
      }, status)
      const cell_contents = CellStatusT.case({
        Open: () => CellContentT.case({
          Mine: () => '!',
          Neighbors: n => n,
          _: () => '',
        }, cell.content),
        Closed: () => '',
      }, new_cell_status)
      return <td onClick={click_on_cell(column_index_x, row_index_x)}>{cell_contents}</td>
    }
  }

  _render_row(status) {
    return (row, row_index_y) => <tr>{row.map(this._render_cell(status, row_index_y))}</tr>
  }

  render() {
    const button_message = GameStatusT.case({
      Playing: () => 'Restart game',
      Lost: () => 'You lost! Click here to restart game',
      StartingGame: () => 'Click on a cell to begin'
    }, this.state.status)

    return <div>
      <button onClick={restart_button_click}>{button_message}</button>
      <table>
        { this.state.board.map(this._render_row(this.state.status)) }
      </table>
    </div>
  }

}
