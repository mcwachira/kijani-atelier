import {queryOptions} from '@tanstack/react-query'
import type {ProductQueryParams} from "@/types"

export const productQuery = (params:ProductQueryParams ={}) => queryOptions({queryKey:["products",params], queryFn:()=>api.getProducts(params)})