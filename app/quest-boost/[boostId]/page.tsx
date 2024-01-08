"use client";

import React, { useCallback, useEffect, useState } from "react";
import styles from "@styles/questboost.module.css";
import {
  getBoostById,
  getQuestParticipants,
  getQuestsInBoost,
} from "@services/apiService";
import Quest from "@components/quests/quest";
import { useRouter } from "next/navigation";
import { QuestDocument } from "../../../types/backTypes";
import Timer from "@components/quests/timer";
import { useAccount } from "@starknet-react/core";
import Button from "@components/UI/button";
import { hexToDecimal } from "@utils/feltService";
import TokenSymbol from "@components/quest-boost/TokenSymbol";
import { TOKEN_ADDRESS_MAP } from "@utils/constants";
import BackButton from "@components/UI/backButton";
import useBoost from "@hooks/useBoost";
import { getTokenName } from "@utils/tokenService";

type BoostQuestPageProps = {
  params: {
    boostId: string;
  };
};

export default function Page({ params }: BoostQuestPageProps) {
  const router = useRouter();
  const { address } = useAccount();
  const { boostId } = params;
  const [quests, setQuests] = useState<QuestDocument[]>([]);
  const [boost, setBoost] = useState<Boost>();
  const [participants, setParticipants] = useState<number>();
  const { getBoostClaimStatus, updateBoostClaimStatus } = useBoost();

  const getTotalParticipants = async (questIds: number[]) => {
    let total = 0;
    await Promise.all(
      questIds?.map(async (questID) => {
        const res = await getQuestParticipants(questID);
        if (res?.count) total += res?.count;
      })
    );
    return total;
  };

  const fetchPageData = async () => {
    const questsList = await getQuestsInBoost(boostId);
    const boostInfo = await getBoostById(boostId);
    const totalParticipants = await getTotalParticipants(boostInfo.quests);
    setQuests(questsList);
    setBoost(boostInfo);
    setParticipants(totalParticipants);
  };

  const getButtonText = useCallback(() => {
    if (!boost) return;
    const chestOpened = getBoostClaimStatus(boost?.id);
    if (boost && boost?.expiry > Date.now()) {
      return "Boost has not ended ⌛";
    } else if (!chestOpened) {
      return "See my reward 🎉";
    } else {
      return "Chest already opened";
    }
  }, [boost, address]);

  const handleButtonClick = useCallback(() => {
    if (!boost) return;
    if (hexToDecimal(boost?.winner ?? "") !== hexToDecimal(address))
      updateBoostClaimStatus(boost?.id, true);

    router.push(`/quest-boost/claim/${boost?.id}`);
  }, [boost, address]);

  useEffect(() => {
    fetchPageData();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.backButton}>
        <BackButton onClick={() => router.back()} />
      </div>
      <div className="flex flex-col">
        <h1 className={styles.title}>{boost?.name}</h1>
        {boost?.expiry && boost.expiry > Date.now() ? (
          <Timer fixed={false} expiry={Number(boost?.expiry)} />
        ) : null}
      </div>

      <div className={styles.card_container}>
        {quests?.map((quest, index) => {
          if (quest?.hidden || quest?.disabled) return null;
          return (
            <Quest
              key={index}
              title={quest.title_card}
              onClick={() => router.push(`/quest/${quest.id}`)}
              imgSrc={quest.img_card}
              issuer={{
                name: quest.issuer,
                logoFavicon: quest.logo,
              }}
              reward={quest.rewards_title}
              id={quest.id}
              expired={quest.expired}
            />
          );
        })}
      </div>
      <div className={styles.claim_button_container}>
        <div className={styles.claim_button_text_content}>
          <p>Reward:</p>
          <div className="flex flex-row gap-2">
            <p className={styles.claim_button_text_highlight}>
              {boost?.amount} {getTokenName(boost?.token ?? "")}
            </p>
            <TokenSymbol tokenAddress={boost?.token ?? ""} />
          </div>
          <p>among</p>
          <p className={styles.claim_button_text_highlight}>
            {participants} players
          </p>
        </div>
        {address ? (
          <div>
            <Button
              disabled={
                boost &&
                (boost?.expiry > Date.now() ||
                  boost?.claimed ||
                  getBoostClaimStatus(boost.id))
              }
              onClick={handleButtonClick}
            >
              {getButtonText()}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
