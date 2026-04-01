import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../api/client";

export function useOfficeSnapshot() {
  return useQuery({
    queryKey: ["office"],
    queryFn: apiClient.getOffice,
    refetchInterval: 5000
  });
}

export function useMessages(channelId: string) {
  return useQuery({
    queryKey: ["messages", channelId],
    queryFn: () => apiClient.getMessages(channelId),
    refetchInterval: 3000
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["office"] });
    }
  });
}
