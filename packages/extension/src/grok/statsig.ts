let statsigId: string | null = null

export function setStatsigId(id: string): void {
	if (id && !statsigId) statsigId = id
}

export function getStatsigId(): string | null {
	return statsigId
}
