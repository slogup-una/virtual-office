import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "../api/client";

export function useOfficeSnapshot() {
  return useQuery({
    queryKey: ["office"],
    queryFn: apiClient.getOffice,
    refetchInterval: 1000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
  });
}

export function useMessages(channelId: string) {
  return useQuery({
    queryKey: ["messages", channelId],
    queryFn: () => apiClient.getMessages(channelId),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true
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

export function useAssignSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ seatKey, slackUserId }: { seatKey: string; slackUserId: string }) =>
      apiClient.assignSeat(seatKey, { slackUserId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office"] });
    }
  });
}

export function useClearSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (seatKey: string) => apiClient.clearSeat(seatKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["office"] });
    }
  });
}

export function useUpdateMyPosition() {
  return useMutation({
    mutationFn: ({
      x,
      y,
      direction,
      isMoving,
      isDancing
    }: {
      x: number;
      y: number;
      direction?: "up" | "down" | "left" | "right";
      isMoving?: boolean;
      isDancing?: boolean;
    }) => apiClient.updateMyPosition({ x, y, direction, isMoving, isDancing })
  });
}
