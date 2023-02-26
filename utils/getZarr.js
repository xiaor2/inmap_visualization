import { openArray } from "https://cdn.skypack.dev/zarr";
export const getZarr = async(pol) => {
  return await openArray({
    store: "https://inmap-model.s3.us-east-2.amazonaws.com",
    path: `isrm_v1.2.1.zarr/${pol}`,
    mode: "r",
    shape: [3, 52411, 52411]});
}