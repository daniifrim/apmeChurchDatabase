import { toast } from "@/hooks/use-toast"

export interface SoundNotificationOptions {
  sound?: boolean
  soundUrl?: string
  volume?: number
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

class SoundNotificationManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private enabled = true

  constructor() {
    this.initAudioContext()
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('AudioContext not supported')
    }
  }

  enable() {
    this.enabled = true
  }

  disable() {
    this.enabled = false
  }

  isEnabled() {
    return this.enabled
  }

  private createAudioElement(url: string): HTMLAudioElement {
    if (this.sounds.has(url)) {
      return this.sounds.get(url)!
    }

    const audio = new Audio(url)
    audio.preload = 'auto'
    this.sounds.set(url, audio)
    return audio
  }

  async playSound(soundUrl: string, volume: number = 0.5) {
    if (!this.enabled) return

    try {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const audio = this.createAudioElement(soundUrl)
      audio.volume = Math.max(0, Math.min(1, volume))
      
      // Reset audio to start if it's already playing
      audio.currentTime = 0
      await audio.play()
    } catch (error) {
      console.warn('Failed to play sound:', error)
    }
  }

  notify(options: SoundNotificationOptions) {
    const {
      sound = true,
      soundUrl = '/sounds/notification.mp3',
      volume = 0.5,
      title = 'Notification',
      description,
      variant = 'default'
    } = options

    // Show toast notification
    toast({
      title,
      description,
      variant
    })

    // Play sound if enabled
    if (sound) {
      this.playSound(soundUrl, volume)
    }
  }

  // Predefined notification methods
  success(message: string, description?: string) {
    this.notify({
      title: message,
      description,
      soundUrl: '/sounds/success.mp3',
      variant: 'default'
    })
  }

  error(message: string, description?: string) {
    this.notify({
      title: message,
      description,
      soundUrl: '/sounds/error.mp3',
      variant: 'destructive'
    })
  }

  warning(message: string, description?: string) {
    this.notify({
      title: message,
      description,
      soundUrl: '/sounds/warning.mp3',
      variant: 'default'
    })
  }

  info(message: string, description?: string) {
    this.notify({
      title: message,
      description,
      soundUrl: '/sounds/info.mp3',
      variant: 'default'
    })
  }

  // New visit notification
  newVisit(churchName: string, visitorName: string) {
    this.success(
      'New Visit Added',
      `${visitorName} visited ${churchName}`
    )
  }

  // Church status update
  churchStatusUpdated(churchName: string, status: string) {
    this.info(
      'Church Status Updated',
      `${churchName} status changed to ${status}`
    )
  }

  // Church created
  churchCreated(churchName: string) {
    this.success(
      'Church Added',
      `${churchName} has been added to the database`
    )
  }
}

export const soundNotifications = new SoundNotificationManager()

// Hook for React components
export function useSoundNotifications() {
  return {
    notify: soundNotifications.notify.bind(soundNotifications),
    success: soundNotifications.success.bind(soundNotifications),
    error: soundNotifications.error.bind(soundNotifications),
    warning: soundNotifications.warning.bind(soundNotifications),
    info: soundNotifications.info.bind(soundNotifications),
    newVisit: soundNotifications.newVisit.bind(soundNotifications),
    churchStatusUpdated: soundNotifications.churchStatusUpdated.bind(soundNotifications),
    churchCreated: soundNotifications.churchCreated.bind(soundNotifications),
    enable: soundNotifications.enable.bind(soundNotifications),
    disable: soundNotifications.disable.bind(soundNotifications),
    isEnabled: soundNotifications.isEnabled.bind(soundNotifications)
  }
}