# Supabase Realtime Patterns

Common patterns for real-time features.

## Chat Application

```javascript
import { useEffect, useState, useRef } from 'react'

function ChatRoom({ roomId, currentUser }) {
  const [messages, setMessages] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const channelRef = useRef(null)

  useEffect(() => {
    // Initial messages load
    supabase
      .from('messages')
      .select('*, users(name, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []))

    // Setup channel
    const channel = supabase.channel(`room:${roomId}`)

    // Listen for new messages
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`
      },
      async (payload) => {
        // Fetch user info
        const { data: user } = await supabase
          .from('users')
          .select('name, avatar_url')
          .eq('id', payload.new.user_id)
          .single()

        setMessages(prev => [...prev, { ...payload.new, users: user }])
      }
    )

    // Track presence
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setOnlineUsers(Object.values(state).flat())
    })

    // Subscribe and track user
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          user_id: currentUser.id,
          name: currentUser.name
        })
      }
    })

    channelRef.current = channel

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [roomId, currentUser])

  const sendMessage = async (text) => {
    await supabase.from('messages').insert({
      room_id: roomId,
      user_id: currentUser.id,
      text
    })
  }

  return (
    <div>
      <div>Online: {onlineUsers.map(u => u.name).join(', ')}</div>
      <div>
        {messages.map(msg => (
          <div key={msg.id}>
            <strong>{msg.users?.name}:</strong> {msg.text}
          </div>
        ))}
      </div>
      <MessageInput onSend={sendMessage} />
    </div>
  )
}
```

## Typing Indicator

```javascript
function useTypingIndicator(roomId, currentUser) {
  const [typingUsers, setTypingUsers] = useState([])
  const channelRef = useRef(null)
  const timeoutRef = useRef(null)

  useEffect(() => {
    const channel = supabase.channel(`typing:${roomId}`)

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== currentUser.id) {
          setTypingUsers(prev => {
            const exists = prev.find(u => u.user_id === payload.user_id)
            if (exists) return prev
            return [...prev, payload]
          })

          // Remove after 3 seconds
          setTimeout(() => {
            setTypingUsers(prev =>
              prev.filter(u => u.user_id !== payload.user_id)
            )
          }, 3000)
        }
      })
      .subscribe()

    channelRef.current = channel

    return () => supabase.removeChannel(channel)
  }, [roomId, currentUser])

  const setTyping = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: currentUser.id, name: currentUser.name }
    })

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
    }, 1000)
  }

  return { typingUsers, setTyping }
}
```

## Collaborative Cursors

```javascript
function useCollaborativeCursors(documentId, currentUser) {
  const [cursors, setCursors] = useState({})
  const channelRef = useRef(null)

  useEffect(() => {
    const channel = supabase.channel(`cursors:${documentId}`)

    channel
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.user_id !== currentUser.id) {
          setCursors(prev => ({
            ...prev,
            [payload.user_id]: payload
          }))
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setCursors(prev => {
          const updated = { ...prev }
          leftPresences.forEach(p => delete updated[p.user_id])
          return updated
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.id,
            name: currentUser.name
          })
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [documentId, currentUser])

  const updateCursor = (x, y) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor',
      payload: {
        user_id: currentUser.id,
        name: currentUser.name,
        x,
        y
      }
    })
  }

  return { cursors, updateCursor }
}
```

## Live Notifications

```javascript
function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Load initial notifications
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications(data || [])
        setUnreadCount(data?.filter(n => !n.read).length || 0)
      })

    // Subscribe to new notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev])
          setUnreadCount(prev => prev + 1)

          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification(payload.new.title, {
              body: payload.new.message
            })
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [userId])

  const markAsRead = async (notificationId) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return { notifications, unreadCount, markAsRead }
}
```

## Live Dashboard/Analytics

```javascript
function useLiveStats() {
  const [stats, setStats] = useState({
    activeUsers: 0,
    ordersToday: 0,
    revenue: 0
  })

  useEffect(() => {
    // Initial fetch
    fetchStats().then(setStats)

    // Subscribe to relevant tables
    const channel = supabase.channel('live-stats')

    // New orders
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => {
        setStats(prev => ({
          ...prev,
          ordersToday: prev.ordersToday + 1,
          revenue: prev.revenue + payload.new.total
        }))
      }
    )

    // User sessions
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      setStats(prev => ({
        ...prev,
        activeUsers: Object.keys(state).length
      }))
    })

    channel.subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return stats
}

async function fetchStats() {
  const today = new Date().toISOString().split('T')[0]

  const { count: ordersToday } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today)

  const { data: revenueData } = await supabase
    .rpc('get_today_revenue')

  return {
    activeUsers: 0,
    ordersToday: ordersToday || 0,
    revenue: revenueData || 0
  }
}
```

## Multiplayer Game State

```javascript
function useGameRoom(roomId, playerId) {
  const [gameState, setGameState] = useState(null)
  const [players, setPlayers] = useState([])
  const channelRef = useRef(null)

  useEffect(() => {
    const channel = supabase.channel(`game:${roomId}`)

    // Game state updates
    channel.on('broadcast', { event: 'game-state' }, ({ payload }) => {
      setGameState(payload)
    })

    // Player moves
    channel.on('broadcast', { event: 'player-move' }, ({ payload }) => {
      // Handle player movement
      setPlayers(prev =>
        prev.map(p =>
          p.id === payload.player_id
            ? { ...p, x: payload.x, y: payload.y }
            : p
        )
      )
    })

    // Player presence
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setPlayers(Object.values(state).flat())
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: playerId,
            name: `Player ${playerId}`,
            x: 0,
            y: 0,
            score: 0
          })
        }
      })

    channelRef.current = channel

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [roomId, playerId])

  const move = (x, y) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'player-move',
      payload: { player_id: playerId, x, y }
    })
  }

  const updateGameState = (state) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'game-state',
      payload: state
    })
  }

  return { gameState, players, move, updateGameState }
}
```

## Optimistic Updates Pattern

```javascript
function useTodos() {
  const [todos, setTodos] = useState([])

  useEffect(() => {
    // Load initial data
    supabase.from('todos').select('*').then(({ data }) => {
      setTodos(data || [])
    })

    // Subscribe to changes
    const channel = supabase
      .channel('todos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todos' },
        (payload) => {
          // Reconcile with server state
          if (payload.eventType === 'INSERT') {
            setTodos(prev => {
              // Check if already added optimistically
              const exists = prev.find(t => t.id === payload.new.id)
              if (exists) return prev
              return [...prev, payload.new]
            })
          } else if (payload.eventType === 'UPDATE') {
            setTodos(prev =>
              prev.map(t => t.id === payload.new.id ? payload.new : t)
            )
          } else if (payload.eventType === 'DELETE') {
            setTodos(prev =>
              prev.filter(t => t.id !== payload.old.id)
            )
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  const addTodo = async (text) => {
    const tempId = `temp-${Date.now()}`
    const newTodo = { id: tempId, text, completed: false }

    // Optimistic update
    setTodos(prev => [...prev, newTodo])

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert({ text, completed: false })
        .select()
        .single()

      if (error) throw error

      // Replace temp with real
      setTodos(prev =>
        prev.map(t => t.id === tempId ? data : t)
      )
    } catch (error) {
      // Rollback on error
      setTodos(prev => prev.filter(t => t.id !== tempId))
      console.error('Failed to add todo:', error)
    }
  }

  return { todos, addTodo }
}
```
