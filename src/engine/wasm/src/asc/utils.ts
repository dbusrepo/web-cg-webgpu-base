// split [0..numTasks-1] between [0..numWorkers-1] and get the index
// range for worker workerIdx in a 64 bit var. Workers on head get one more task if needed.
function range(workerIdx: u32, numWorkers: u32, numTasks: u32): u64 {
  const numTaskPerWorker: u32 = numTasks / numWorkers;
  const numTougherThreads: u32 = numTasks % numWorkers;
  const isTougher: u32 = i32(workerIdx < numTougherThreads);

  const start = isTougher ?
    workerIdx * (numTaskPerWorker + 1) :
    numTasks - (numWorkers - workerIdx) * numTaskPerWorker;

  const end = start + numTaskPerWorker + isTougher;
    return (start as u64) << 32 | end;
}

export { range };
