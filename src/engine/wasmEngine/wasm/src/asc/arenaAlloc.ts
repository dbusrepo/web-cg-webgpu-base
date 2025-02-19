import { myAssert } from './myAssert';
import { alloc, free, assertPtrLowerBound } from './workerHeapManager';
import { PTR_SIZE, PTR_ALIGN_MASK, SIZE_T, MAX_ALLOC_SIZE, isPowerOfTwo, 
         PTR_T, NULL_PTR, getTypeSize, getTypeAlignMask, nextPowerOfTwo } from './memUtils';
import { logi } from './importVars';

// The arena allocs blocks of objects. Free objects are linked in a free list
// Pointers in the free list are stored at the beg of the object mem

// @ts-ignore: decorator
@final @unmanaged class ArenaAlloc {

  private blockPtr: PTR_T; // block ptr
  private nextPtr: PTR_T; // next allocation in block
  private freePtr: PTR_T; // free list head ptr
  private numLeft: SIZE_T; // number of remaining allocable objs in cur block
  private numObjsBlock: SIZE_T; // number of allocable objs per block
  private blockSize: SIZE_T; // tot bytes allocated per block
  private objSize: SIZE_T; // total bytes (obj+align pad) per obj, obj are aligned
  private alignMask: SIZE_T; // objects align mask

  private constructor() { 
    this.blockPtr = NULL_PTR;
    this.freePtr = NULL_PTR;
    this.nextPtr = NULL_PTR;
    this.blockSize = 0;
    this.objSize = 0;
    this.numObjsBlock = 0;
    this.numLeft = 0;
    this.alignMask = 0;
  }

  init(objSize: SIZE_T, numObjsBlock: SIZE_T, objAlignLg2: SIZE_T): void {
    myAssert(objSize > 0);
    myAssert(numObjsBlock > 0);
    const objSizeNoPad = max(objSize, PTR_SIZE);
    const objSizePow2 = nextPowerOfTwo(objSizeNoPad);
    const objSizeAlign = max(<SIZE_T>(1) << objAlignLg2, objSizePow2);
    myAssert(isPowerOfTwo(objSizeAlign));
    const objAlignMask =  objSizeAlign - 1;
    const blockSize: SIZE_T = numObjsBlock * objSizeAlign + objAlignMask;
    myAssert(blockSize <= MAX_ALLOC_SIZE);
    this.blockSize = blockSize;
    this.objSize = objSizeAlign;
    this.alignMask = objAlignMask;
    this.numObjsBlock = numObjsBlock;
    this.blockPtr = NULL_PTR;
    this.freePtr = NULL_PTR;
    this.nextPtr = NULL_PTR;
    this.numLeft = 0;
  }

  @inline private allocBlock(): void {
    // Note: the previous block ptr is lost, its objs are allocable with the free list
    this.blockPtr = alloc(this.blockSize);
    this.nextPtr = this.blockPtr;
    this.numLeft = this.numObjsBlock;
  }

  public alloc(): PTR_T {
    let dataPtr: PTR_T;
    if (this.freePtr != NULL_PTR) {
      dataPtr = this.freePtr;
      this.freePtr = load<PTR_T>(this.freePtr);
      myAssert((this.freePtr == NULL_PTR) || ((this.freePtr & this.alignMask) == 0));
    } else {
      if (this.numLeft == 0) {
        this.allocBlock();
      }
      myAssert(this.numLeft > 0 && this.nextPtr !== NULL_PTR);
      dataPtr = (this.nextPtr + this.alignMask) & ~this.alignMask;
      this.nextPtr += this.objSize;
      this.numLeft--;
    }
    myAssert((dataPtr & this.alignMask) == 0);
    return dataPtr;
  }

  @inline public free(ptr: PTR_T): void {
    if (ptr != NULL_PTR) {
      assertPtrLowerBound(ptr);
      myAssert((ptr & this.alignMask) == 0); // add other checks ?
      store<PTR_T>(ptr, this.freePtr);
      this.freePtr = ptr;
    }
  }

}

function newArena(objSize: SIZE_T, numObjsBlock: SIZE_T, objAlignLg2: SIZE_T = alignof<PTR_T>()): ArenaAlloc {
  const arenaSize = getTypeSize<ArenaAlloc>();
  const ptr: PTR_T = alloc(arenaSize);
  const arena = changetype<ArenaAlloc>(ptr);
  arena.init(objSize, numObjsBlock, objAlignLg2);
  return arena;
}

export { ArenaAlloc, newArena };
