import { Lifecycle } from '../lifecycle.js'
import { injectable } from './injectable.js'

export function singleton() {
  return injectable(Lifecycle.singleton)
}
