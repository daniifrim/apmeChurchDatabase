
import React from 'react';
import { IndexBar, List } from 'antd-mobile';
import type { Church } from '@/types';

interface ChurchListProps {
  churches: Church[];
  onChurchSelect: (church: Church) => void;
  selectedChurchId?: number;
}

const ChurchList: React.FC<ChurchListProps> = ({ churches, onChurchSelect, selectedChurchId }) => {
  const groups = churches
    .sort((a, b) => a.name.localeCompare(b.name))
    .reduce((acc, church) => {
      const firstLetter = church.name[0].toUpperCase();
      const group = acc.find((g) => g.title === firstLetter);
      if (group) {
        group.items.push(church);
      } else {
        acc.push({ title: firstLetter, items: [church] });
      }
      return acc;
    }, [] as { title: string; items: Church[] }[]);

  return (
    <div style={{ height: '100%' }}>
      <IndexBar>
        {groups.map((group) => (
          <IndexBar.Panel
            index={group.title}
            title={group.title}
            key={group.title}
          >
            <List>
              {group.items.map((church) => (
                <List.Item
                  key={church.id}
                  onClick={() => onChurchSelect(church)}
                  className={selectedChurchId === church.id ? 'bg-blue-100' : ''}
                >
                  {church.name}
                </List.Item>
              ))}
            </List>
          </IndexBar.Panel>
        ))}
      </IndexBar>
    </div>
  );
};

export default ChurchList;
