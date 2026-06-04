import { Dimensions } from "react-native";
import type { ReactElement } from "react";

const { width } = Dimensions.get("window");
export const CAROUSEL_CARD_WIDTH = width * 0.85;
export const CAROUSEL_CARD_MARGIN = 16;

export interface CarouselProps<T> {
    data: T[];
    renderItem: ({ item, index }: { item: T; index: number }) => ReactElement;
    keyExtractor: (item: T, index: number) => string;
    title?: string;
    viewAllHref?: string;
}
