import React from 'react'
import F from 'flyd'
import T from '../union-type'
import R from 'ramda'

// parameters

const board_size = { width: 16, height: 16 }
const total_mines = 40

// model types

const CellStatusT = T({ Closed: [], Open: [] })

const CellContentT = T({
  Neighbors: [Number],
  Mine: [],
  Unknown: []
})

const GameStatusT = T({ Playing: [], Lost: [], StartingGame: [] })

// cell is of type { status: CellStatusT, content: CellContentT }

const init_cell_state = { status: CellStatusT.Closed(), content: CellContentT.Unknown() }

const cell_is_a_mine = { status: CellStatusT.Closed(), content: CellContentT.Mine() }

// input stream

const UserClickT = T({ UserClick: [Number, Number], RestartGame: [], GameLost: [] })

const input_stream = F.stream(UserClickT.RestartGame()) // values of type UserClickT

const button_click = F.stream()

// model streams

// returns Array of Array of CellStateT
const initialize_board = (size, mines, cell_state) =>
  R.repeat(R.repeat(cell_state, size.width), size.height)

const init_board_model = initialize_board(board_size, total_mines, init_cell_state)
const init_game_status = GameStatusT.StartingGame()

function update_board(board, click) {
  // TODO
  return board
}

function update_status(status, click) {
  // TODO
  return status
}

function fill_random_board(size, mines) {
  const area = size.width * size.height
  // some big primes: 2922509, 3276509, 94418953, 321534781, 433494437, 780291637
  const shift = 2922509
  const modulus = 94418953
  const mines_indices = R.range(0, mines).map(x => (x*modulus + shift) % area).map(x => ({ x: x%size.width, y: (x-x%size.width)/size.height }))
  console.log('computed indices of mines', mines_indices)
  const filled_board = R.reduce( (board, {x,y} ) => {
    // x,y are guaranteed to be unique indices
    console.log('setting mine at', x,y)
    return R.update(y, R.update(x, cell_is_a_mine, board[y]), board)
  }, init_board_model, mines_indices)

}

//
//fillRandomBoard : Int -> Int -> Int -> GameBoard -> Seed -> (GameBoard, Seed)
//fillRandomBoard x y n board seed =
//if n == 0 then (fillNeighbors board, seed)
//else
//let
//    (mineX, seed1) = generate (int 0 (getBoardWidth board - 1)) seed
//(mineY, seed2) = generate (int 0 (getBoardHeight board - 1)) seed1
//(cellStatus, cellContents) = getCell mineX mineY board
//in
//if mineX == x || mineY == y
//  then
//fillRandomBoard x y n board seed2
//else
//case cellContents of
//    Mine -> fillRandomBoard x y n board seed2
//    _ -> fillRandomBoard x y (n-1) (modifyCell mineX mineY (cellStatus, Mine) board) seed2


const board_model = F.scan(update_board, init_board_model,input_stream) // values of type Array of Array of CellStateT
const game_status = F.scan(update_status, init_game_status, input_stream) // values of type GameStatusT

export default class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = { board: init_board_model, status: init_game_status }
  }

  componentDidMount() { // boilerplate
    board_model.map(b => this.setState({ board: b }))
    game_status.map(s => this.setState({ status: s }))
  }

  _render_cell(status) {
    return cell => {
      const new_cell_status = GameStatusT.case({
        Playing: () => cell.status,
        Lost: () => CellStatusT.Open(),
        StartingGame: () => CellStatusT.Closed(),
      }, status)
      const cell_contents = CellStatusT.case({
        Open: () => CellContentT.case({
          Unknown: () => '',
          Mine: () => '!',
          Neighbors: n => n
        }, cell.content),
        Closed: () => '',
      }, new_cell_status)
      return <td>{cell_contents}</td>
    }

  }

  _render_row(status) {
    return row => <tr>{row.map(this._render_cell(status))}</tr>
  }

  render() {
    const button_message = GameStatusT.case({
      Playing: () => 'Restart game',
      Lost: () => 'You lost! Click here to restart game',
      StartingGame: () => 'Click on a cell to begin'
    }, this.state.status)

    return <div>
      <button onClick={button_click}>{button_message}</button>
      <table>
        { this.state.board.map(this._render_row(this.state.status)) }
      </table>
    </div>
  }

}

/*


 clickSignal : Signal UserClick
 clickSignal = Signal.subscribe clickChannel

 type CellStatus = Closed | Open
 type CellContents = Neighbors Int | Mine
 type alias CellState = (CellStatus, CellContents)
 type alias GameBoard = Array (Array CellState)
 type GameStatus = Playing | Lost | StartingGame
 type alias GameState = (GameStatus, GameBoard, Seed)

 dummyState = (Closed, Neighbors (-1))

 getBoardWidth board = Array.length board

 getBoardHeight board = withDefault 0 <| Maybe.map Array.length (Array.get 0 board)

 initializeState : Int -> Int -> Seed -> GameState
 initializeState w h seed = (StartingGame, Array.repeat w (Array.repeat h dummyState), seed)

 main : Signal Element
 main = clickSignal
 |> Signal.foldp updateState (initializeState board_width board_height (initialSeed 12345))
 |> Signal.map drawScene

 drawScene : GameState -> Element
 drawScene (status, board, _) = flow down [spacer 10 10, flow right [spacer 10 10, drawBoard board, spacer 30 30,
 case status of
 Lost ->
 clickable (Signal.send clickChannel (RestartGame board_width board_height))
 <| color grey
 <| centered <| fromString "You lost, click this to clear game"
 StartingGame -> centered <| fromString "Click to begin"
 Playing ->
 clickable (Signal.send clickChannel (RestartGame board_width board_height))
 <| color grey
 <| centered <| fromString "Restart game"
 ]
 ]

 totalBoardWidth board = (cellSize+2)*(getBoardWidth board)
 totalBoardHeight board = (cellSize+2)*(getBoardHeight board)

 drawBoard : GameBoard -> Element

 drawBoard board = color black <| container (totalBoardWidth board + 2) (totalBoardHeight board + 2) middle <| flow right <| List.map drawColumn <| toIndexedList board

 drawColumn : (Int, Array CellState) -> Element
 drawColumn (x, column) = flow down <| List.map (drawCell' x) <| toIndexedList column

 drawCell' x (y, c) = color black
 <| container (cellSize+2) (cellSize+2) middle
 <| clickable (Signal.send clickChannel (UserClick x y))
 <| drawCell c

 drawCell : CellState -> Element
 drawCell (status, contents) =
 let
 cellElement = case contents of
 Mine -> color red <| container cellSize cellSize middle <| centered <| fromString "!"
 Neighbors 0 -> color white <| spacer (cellSize+2) (cellSize+2)
 Neighbors n -> color white <| container cellSize cellSize middle <| asText n
 in
 case status of
 Open -> cellElement
 _ -> color grey <| spacer cellSize cellSize

 getCell : Int -> Int -> GameBoard -> CellState
 getCell x y board = withDefault dummyState <| Array.get x board `andThen` (\column -> Array.get y column)

 numberOfMines : Int -> Int -> GameBoard -> Int
 numberOfMines x y board = case getCell x y board of
 (_, Mine) -> 1
 _ -> 0

 updateState : UserClick -> GameState -> GameState
 updateState click oldState = case (click, oldState) of
 (RestartGame w h, (status, board, seed)) -> initializeState w h seed
 (UserClick x y, (status, board, seed)) ->
 case status of
 StartingGame ->
 let
 (newRandomBoard, newSeed) = fillRandomBoard x y mines board seed
 in
 (Playing, revealNeighbors [(x,y)] newRandomBoard, newSeed)
 Playing ->
 case getCell x y board of
 (Open, _) -> (Playing, board, seed)
 (Closed, Mine) -> (Lost, revealAll board, seed)
 (Closed, Neighbors _) -> (Playing, revealNeighbors [(x,y)] board, seed)
 _ -> (status, board, seed)

 revealNeighbors list board =
 case list of
 [] -> board
 (x,y)::rest -> case (getCell x y board) of
 (Open, _) -> revealNeighbors rest board
 (Closed, Mine) -> revealNeighbors rest board
 (Closed, Neighbors 0) -> let newList = List.append (neighbors x y) rest in revealNeighbors newList <| modifyCell x y (Open, Neighbors 0) board
 (Closed, Neighbors n) -> revealNeighbors rest <| modifyCell x y (Open, Neighbors n) board

 neighbors x y = [ (x-1,y-1), (x,y-1), (x+1,y-1), (x-1,y), (x+1,y),
 (x-1,y+1), (x,y+1), (x+1,y+1) ]

 fillNeighbors board =
 let
 computeNeighbors x y (status, contents) =
 let
 nMines (x, y) = numberOfMines x y board
 sumNeighbors = List.foldl1 (+) <| List.map nMines  <| neighbors x y
 in
 case contents of
 Mine -> (status, Mine)
 _ ->  (status, Neighbors sumNeighbors)
 fillNeighborsInColumn x column = indexedMap (computeNeighbors x) column
 in
 indexedMap fillNeighborsInColumn board

 fillRandomBoard : Int -> Int -> Int -> GameBoard -> Seed -> (GameBoard, Seed)
 fillRandomBoard x y n board seed =
 if n == 0 then (fillNeighbors board, seed)
 else
 let
 (mineX, seed1) = generate (int 0 (getBoardWidth board - 1)) seed
 (mineY, seed2) = generate (int 0 (getBoardHeight board - 1)) seed1
 (cellStatus, cellContents) = getCell mineX mineY board
 in
 if mineX == x || mineY == y
 then
 fillRandomBoard x y n board seed2
 else
 case cellContents of
 Mine -> fillRandomBoard x y n board seed2
 _ -> fillRandomBoard x y (n-1) (modifyCell mineX mineY (cellStatus, Mine) board) seed2

 modifyCell : Int -> Int -> CellState -> GameBoard -> GameBoard
 modifyCell x y cellState board = withDefault board <| Array.get x board `andThen` (\column -> Just <| Array.set x (Array.set y cellState column) board)

 revealAll = Array.map (Array.map revealCell)
 revealCell (status, contents) = (Open, contents)
 */