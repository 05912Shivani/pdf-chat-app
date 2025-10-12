import { useState, useRef, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  Flex,
  useToast,
  Button,
  IconButton,
  useColorMode,
  useColorModeValue,
  ColorModeScript,
} from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';
import { v4 as uuidv4 } from 'uuid';
import ChatHistory from './components/ChatHistory';
import ChatWindow from './components/ChatWindow';
import { processPDF, queryLLM } from './services/api';

function AppContent() {
  const [chats, setChats] = useState(() => {
    const savedChats = localStorage.getItem('chatHistory');
    return savedChats ? JSON.parse(savedChats) : [];
  });
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const { colorMode, toggleColorMode } = useColorMode();

  // Sync chats with localStorage
  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(chats));
  }, [chats]);

  // Create new chat
  const createNewChat = () => {
    const newChat = {
      id: uuidv4(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setChats([newChat, ...chats]);
    setActiveChat(newChat.id);
  };

  // Delete chat
  const handleDeleteChat = (id) => {
    setChats(prevChats => prevChats.filter(chat => chat.id !== id));
    if (activeChat === id) setActiveChat(null);
    toast({
      title: 'Chat deleted',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // File upload
  const handleFileUpload = async (file) => {
    try {
      setIsLoading(true);
      const result = await processPDF(file);
      setChats(chats =>
        chats.map(chat =>
          chat.id === activeChat
            ? {
                ...chat,
                pdfData: result,
                title: `PDF: ${file.name}`,
                messages: [
                  ...chat.messages,
                  {
                    id: uuidv4(),
                    content: `Uploaded and processed PDF: ${file.name}`,
                    sender: 'system',
                    timestamp: new Date().toISOString(),
                  },
                ],
              }
            : chat
        )
      );
      toast({
        title: 'PDF Processed',
        description: 'The PDF has been successfully processed and is ready for querying.',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process PDF',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Send message & get AI response
  const handleSendMessage = async (message) => {
    if (!message.trim() || !activeChat) return;

    const userMessage = {
      id: uuidv4(),
      content: message,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const updatedChats = chats.map(chat =>
      chat.id === activeChat
        ? { ...chat, messages: [...chat.messages, userMessage] }
        : chat
    );
    setChats(updatedChats);

    setIsLoading(true);
    try {
      const response = await queryLLM({
        message,
        chatHistory: updatedChats.find(c => c.id === activeChat)?.messages || [],
        context: updatedChats.find(c => c.id === activeChat)?.pdfData,
      });

      const aiMessage = {
        id: uuidv4(),
        content: response.answer,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      setChats(chats =>
        chats.map(chat =>
          chat.id === activeChat
            ? {
                ...chat,
                messages: [...chat.messages, aiMessage],
                title: chat.messages.length === 0 ? message.slice(0, 30) + '...' : chat.title,
              }
            : chat
        )
      );
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: 'Error getting response',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const overlayBg = useColorModeValue('white', 'gray.900');
  const overlayText = useColorModeValue('gray.800', 'gray.200');
  const overlaySubText = useColorModeValue('gray.600', 'gray.400');

  return (
    <Flex h="100vh" bg={useColorModeValue('gray.50', 'gray.800')} position="relative">
      {/* Theme Toggle Button */}
      <IconButton
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        aria-label="Toggle Theme"
        onClick={toggleColorMode}
        position="absolute"
        top={4}
        right={4}
        zIndex={10}
      />

      {/* Sidebar */}
      <ChatHistory
        chats={chats}
        activeChat={activeChat}
        onSelectChat={setActiveChat}
        onCreateNewChat={createNewChat}
        onDeleteChat={handleDeleteChat}
      />

      {/* Main Chat Area */}
      <Box flex={1} display="flex" flexDirection="column" h="100vh" position="relative">
        <ChatWindow
          messages={activeChat ? (chats.find(c => c.id === activeChat)?.messages || []) : []}
          onSendMessage={activeChat ? handleSendMessage : () => {}}
          onFileUpload={activeChat ? handleFileUpload : () => {}}
          isLoading={isLoading}
          fileInputRef={fileInputRef}
        />

        {/* Welcome Overlay */}
        {!activeChat && (
          <Box
            position="absolute"
            inset={0}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            textAlign="center"
            p={4}
            bg={overlayBg}
            zIndex={1}
          >
            <Box maxW="md" p={8} borderRadius="lg" boxShadow="sm">
              <Box fontSize="2xl" fontWeight="bold" mb={4} color={overlayText}>
                Welcome to PDF Chat! 🎉<br></br>
                Your personal PDF assistant is ready.
              </Box>
              <Box mb={6} color={overlaySubText}>
                Upload your PDFs, ask questions, and discover insights in seconds.<br></br>
                Hit "New Chat" to get started!
              </Box>
              <Button colorScheme="blue" onClick={createNewChat}>
                New Chat
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Flex>
  );
}

export default function App() {
  return (
    <ChakraProvider>
      <ColorModeScript />
      <AppContent />
    </ChakraProvider>
  );
}
